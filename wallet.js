import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { Worker } from 'worker_threads'
import { createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { deriveAddress, derivePublicKey, generateSeed } from '@xrplkit/wallet'
import { ask, awaitInterrupt, cyan, red } from './terminal.js'
import { keyToMnemonic, mnemonicToKey } from './rfc1751.js'
import { decodeSeed, encodeSeed, codec } from 'ripple-address-codec'


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


export async function createWallet({ entropy }){
	if(!entropy)
		entropy = await ask({ message: `enter entropy for seed (optional): ` })

	let entropyBytes = Array.from(Buffer.from(entropy)).slice(0, 16)
	let vanityRegex
	let seed

	if(entropyBytes.length < 16){
		if(entropyBytes.length !== 0)
			console.log(`got ${entropyBytes.length} bytes of user entropy, filling ${16 - entropyBytes.length} bytes with system entropy`)

		vanityRegex = await ask({
			message: `enter wallet address criteria in regex format (optional): `,
			validate: input => {
				try{
					new RegExp(input).toString()
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

	let decodedSeed = decodeSeed(seed).bytes
	let passphrase = await ask({
		message: `enter protection passphrase (optional): `,
		redactAfter: true
	})

	if(passphrase.length > 0){
		let encryptedPayload = encrypt({
			payload: decodedSeed,
			passphrase
		})

		console.log(``)
		console.log(`wallet address: ${deriveAddress({ seed })}`)
		console.log(`wallet seed (encrypted): ${encodeSeed(encryptedPayload, 'ed25519')}`)
		console.log(`wallet mnemonic (encrypted): ${keyToMnemonic(encryptedPayload)}`)
	}else{
		console.log(``)
		console.log(`wallet address: ${deriveAddress({ seed })}`)
		console.log(`wallet seed: ${seed}`)
		console.log(`wallet mnemonic: ${keyToMnemonic(decodedSeed)}`)
	}
}

export async function checkWallet({ secret }){
	let { address } = secret
		? deriveCredentials(seed)
		: await askSecret({ message: `enter wallet secret: ` })

	console.log(`wallet address: ${address}`)
}

export async function closeWallet(){
	
}

async function performVanitySearch({ num, criteria, entropy }){
	let workers = []
	var wallets = []
	let iters = []
	let stopped = false

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
		message: `select wallet from above (1-${wallets.length}): `,
		validate: input => !(input >= 1 && input <= wallets.length)
			&& 'invalid choice - try again'
	})

	return wallets[parseInt(choice) - 1].seed
}

export async function askSecret({ message = `enter secret key: ` }){
	while(true){
		let secret
		let input = ''
		
		input = await ask({ 
			message,
			preset: input,
			redactAfter: true,
		})
		input = input.trim()

		try{
			if(input.includes(' ')){
				secret = mnemonicToKey(input)
			}else{
				secret = decodeSeed(input).bytes
			}
		}catch(error){
			console.log(red(`malformed key: ${error.message} - try again`))
			continue
		}

		while(true){
			let passphrase = await ask({
				message: `enter protection passphrase: `,
				redactAfter: true
			})

			if(passphrase.length === 0)
				break

			try{
				secret = decrypt({
					payload: secret,
					passphrase
				})
				encodeSeed(secret, 'ed25519')
				break
			}catch(error){
				console.log(red(`wrong passphrase: ${error.message} - try again`))
			}
		}

		let seed = encodeSeed(secret, 'ed25519')

		return {
			seed,
			address: deriveAddress({ seed })
		}
	}
}

function encrypt({ payload, passphrase }){
	let cipher = createCipheriv(
		'aes-128-ecb',
		Buffer.from(psw2key(passphrase)), 
		Buffer.from('')
	)

	cipher.setAutoPadding(false)

	return Buffer.concat([
		cipher.update(payload), 
		cipher.final()
	])
}

function decrypt({ payload, passphrase }){
	let cipher = createDecipheriv(
		'aes-128-ecb',
		Buffer.from(psw2key(passphrase)), 
		Buffer.from('')
	)

	cipher.setAutoPadding(false)

	return Buffer.concat([
		cipher.update(payload), 
		cipher.final()
	])
}

function deriveCredentials(input){
	if(input.includes(' ')){
		try{
			let seed = encodeSeed(
				mnemonicToBuffer(input),
				'ed25519'
			)
			return {
				seed,
				address: deriveAddress({ seed })
			}
		}catch{}
	}else{
		try{
			return {
				seed: input,
				address: deriveAddress({ seed: input })
			}
		}catch{}
	
		try{
			return {
				secretKey: input,
				address: deriveAddress({
					publicKey: derivePublicKey({ privateKey: input })
				})
			}
		}catch{}
	}
}

function psw2key(passphrase){
	return pbkdf2Sync(
		Buffer.from(passphrase),
		Buffer.from('XRP LEDGER WALLET SALT'),
		1024,
		16,
		'sha1'
	)
}