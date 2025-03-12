import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { Worker } from 'worker_threads'
import { deriveAddress, generateSeed } from '@xrplkit/wallet'
import { ask, awaitInterrupt, cyan } from '../util/terminal.js'
import { askSecret } from './credentials.js'
import { keyToMnemonic } from './rfc1751.js'
import { decodeSeed } from 'xrpl'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


export async function createWallet({ entropy }){
	if(!entropy)
		entropy = await ask({
			message: `entropy for seed`,
			hint: `optional`
		})

	let entropyBytes = Array.from(Buffer.from(entropy)).slice(0, 16)
	let vanityRegex
	let seed

	if(entropyBytes.length < 16){
		if(entropyBytes.length !== 0)
			console.log(`got ${entropyBytes.length} bytes of user entropy, filling ${16 - entropyBytes.length} bytes with system entropy`)

		vanityRegex = await ask({
			message: `wallet address criteria in regex format`,
			hint: `optional`,
			validate: input => {
				try{
					new RegExp(input).toString()
					return true
				}catch(error){
					return error.message
				}
			}
		})

		if(vanityRegex.length === 0)
			vanityRegex = undefined
	}

	if(vanityRegex){
		seed = await performVanitySearch({
			num: os.cpus().length,
			criteria: vanityRegex,
			entropy
		})
	}else{
		seed = generateSeed({ entropy, algorithm: 'ed25519' })
	}

	console.log(``)
	console.log(`wallet address: ${cyan(deriveAddress({ seed }))}`)
	console.log(`wallet seed: ${cyan(seed)}`)
	console.log(`wallet mnemonic: ${cyan(keyToMnemonic(decodeSeed(seed).bytes))}`)
}

export async function verifyWallet({ secret }){
	let { address } = secret
		? deriveCredentials(seed)
		: await askSecret({ message: `wallet secret` })

	console.log(``)
	console.log(`wallet address: ${address}`)
}

export async function closeWallet(){
	
}

async function performVanitySearch({ num, criteria, entropy }){
	let workers = []
	var wallets = []
	let iters = []
	let stopped = false

	console.log(``)
	console.log(`performing vanity search with ${num} workers`)
	console.log(``)

	for(let i=0; i<num; i++){
		let worker = new Worker(
			path.join(__dirname, 'worker.js'), 
			{
				workerData: {
					task: 'vanity', 
					criteria, 
					entropy
				}
			}
		)

		worker.on('message', ({ type, ...data }) => {
			switch(type){
				case 'progress':
					iters[i] = data.iters
					break

				case 'found':
					wallets.push(data)
					process.stdout.clearLine()
					console.log(`[${cyan(wallets.length)}] ${data.address}`)
					break
			}
		})

		iters.push(0)
		workers.push(worker)
	}

	awaitInterrupt()
		.then(() => stopped = true)

	while(!stopped){
		await new Promise(resolve => setTimeout(resolve, 25))

		let itersSum = iters.reduce((s, i) => s + i, 0)

		process.stdout.write(`searched ${itersSum} keypairs... press CTRL+C to stop\r`)
	}

	for(let worker of workers){
		worker.terminate()
	}

	console.log('')

	if(wallets.length === 0){
		console.log('no wallets found')
		process.exit()
	}

	if(wallets.length === 1){
		return wallets[0].seed
	}

	let choice = await ask({
		message: `select wallet from above (1-${wallets.length})`,
		validate: input => input >= 1 && input <= wallets.length
			? true
			: 'invalid choice - try again'
	})

	return wallets[parseInt(choice) - 1].seed
}