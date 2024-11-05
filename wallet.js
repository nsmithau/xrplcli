import { deriveAddress, derivePublicKey, generateSeed } from '@xrplkit/wallet'
import { ask, askChoice, askConfirm, cyan } from './terminal.js'
import { bufferToMnemonic } from './rfc1751.js'
import { decodeSeed } from 'ripple-address-codec'

export async function createWallet({ entropy }){
	if(!entropy)
		entropy = await ask({ message: `enter entropy for seed (optional): ` })

	let entropyBytes = Array.from(Buffer.from(entropy)).slice(0, 16)
	let vanityRegex
	let address
	let seed

	if(entropyBytes.length < 16){
		console.log(`got ${entropyBytes.length} bytes of user entropy, filling ${16 - entropyBytes.length} bytes with system entropy`)

		if(await askConfirm({ message: `should the wallet address contain something specific?` })){
			vanityRegex = await ask({
				message: `enter the criteria in regex format: `,
				validate: input => {
					try{
						new RegExp(input).toString()
					}catch(error){
						return error.message
					}
				}
			})
		}
	}

	if(vanityRegex){

	}else{
		seed = generateSeed({ entropy, algorithm: 'ed25519' })
		address = deriveAddress({ seed })
	}

	if(await askConfirm({ message: `password protect seed?` })){
		
	}

	let format = await askChoice({
		message: 'output wallet seed as',
		options: {
			base58: 'base58 (xrp)',
			mnemonic: 'mnemonic (rfc1751)'
		}
	})

	console.log(``)
	console.log(`wallet address: ${address}`)

	switch(format){
		case 'base58': {
			console.log(`wallet seed: ${seed}`)
			break
		}
		case 'mnemonic': {
			console.log(`wallet mnemonic: ${bufferToMnemonic(decodeSeed(seed).bytes)}`)
			break
		}
	}
}

export async function closeWallet(){
	
}

export async function askSecret({ message = 'enter secret key' }){
	let input = await ask({ 
		message,
		validate: input => !deriveCredentials(input) 
			&& 'invalid key - try again'
	})

	process.stdout.moveCursor(0, -1)
	process.stdout.write(`${message}: ${cyan('*'.repeat(input.length))}\n`)

	return deriveCredentials(input)
}

function deriveCredentials(input){
	try{
		return {
			seed: input,
			address: deriveAddress({ seed: input })
		}
	}catch{
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