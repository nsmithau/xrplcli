import { createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { deriveAddress, derivePublicKey, generateSeed } from '@xrplkit/wallet'
import { ask, askConfirm } from './terminal.js'
import { bufferToMnemonic, mnemonicToBuffer } from './rfc1751.js'
import { decodeSeed, encodeSeed, codec } from 'ripple-address-codec'

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

	let decodedSeed = decodeSeed(seed).bytes

	if(await askConfirm({ message: `password protect seed?` })){
		let encryptedPayload = encrypt({
			payload: decodedSeed,
			passphrase: await ask({
				message: `enter protection passphrase: `,
				redactAfter: true
			})
		})

		console.log(``)
		console.log(`wallet address: ${address}`)
		console.log(`wallet seed (encrypted): ${encodeEncryptedSeed(encryptedPayload)}`)
		console.log(`wallet mnemonic (encrypted): ${bufferToMnemonic(encryptedPayload)}`)
	}else{
		console.log(``)
		console.log(`wallet address: ${address}`)
		console.log(`wallet seed: ${seed}`)
		console.log(`wallet mnemonic: ${bufferToMnemonic(decodedSeed)}`)
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
		redactAfter: true,
		validate: input => !deriveCredentials(input) 
			&& `invalid ${input.includes(' ') ? `mnemonic` : `secret`} - try again`
	})

	return deriveCredentials(input)
}

function encrypt({ payload, passphrase }){
	let cipher = createCipheriv(
		'aes-128-ecb',
		Buffer.from(psw2key(passphrase)), 
		Buffer.from('')
	)

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

	return Buffer.concat([
		cipher.update(encryptedSeedBuffer), 
		cipher.final()
	])
}

function encodeEncryptedSeed(seed){
	return codec.encode(
		new Uint8Array(seed),
		{
			versions: [250, 106],
			expectedLength: 32
		}
	)
}

function decodeEncryptedSeed(seed){
	return codec.decode(seed, {
		versions: [[250, 106]],
		expectedLength: 32
	}).bytes
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