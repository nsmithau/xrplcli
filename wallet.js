import { deriveAddress, derivePublicKey, generateSeed } from '@xrplkit/wallet'
import { ask, askChoice, askConfirm, cyan } from './terminal.js'
import { bufferToMnemonic, mnemonicToBuffer } from './rfc1751.js'
import { decodeSeed, encodeSeed } from 'ripple-address-codec'

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
		let encryptedSeed = seed

		console.log(``)
		console.log(`wallet address: ${address}`)
		console.log(`wallet seed (encrypted): ${encryptedSeed}`)
		console.log(`wallet mnemonic (encrypted): ${bufferToMnemonic(decodeSeed(encryptedSeed).bytes)}`)
	}else{
		console.log(``)
		console.log(`wallet address: ${address}`)
		console.log(`wallet seed: ${seed}`)
		console.log(`wallet mnemonic: ${bufferToMnemonic(decodeSeed(seed).bytes)}`)
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

export async function askSecret({ message = `enter secret key: ` }){
	let input = await ask({ 
		message,
		validate: input => !deriveCredentials(input) 
			&& `invalid ${input.includes(' ') ? `mnemonic` : `secret`} - try again`
	})

	process.stdout.moveCursor(0, -1)
	process.stdout.write(`${message}: ${cyan('*'.repeat(input.length))}\n`)

	return deriveCredentials(input)
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