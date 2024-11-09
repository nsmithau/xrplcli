import { createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { deriveAddress, derivePublicKey, generateSeed } from '@xrplkit/wallet'
import { ask, red } from './terminal.js'
import { keyToMnemonic, mnemonicToKey } from './rfc1751.js'
import { decodeSeed, encodeSeed, codec } from 'ripple-address-codec'

export async function createWallet({ entropy }){
	if(!entropy)
		entropy = await ask({ message: `enter entropy for seed (optional): ` })

	let entropyBytes = Array.from(Buffer.from(entropy)).slice(0, 16)
	let vanityRegex
	let address
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

	}else{
		seed = generateSeed({ entropy, algorithm: 'ed25519' })
		address = deriveAddress({ seed })
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
		console.log(`wallet address: ${address}`)
		console.log(`wallet seed (encrypted): ${encodeEncryptedSeed(encryptedPayload)}`)
		console.log(`wallet mnemonic (encrypted): ${keyToMnemonic(encryptedPayload)}`)
	}else{
		console.log(``)
		console.log(`wallet address: ${address}`)
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

export async function askSecret({ message = `enter secret key: ` }){
	while(true){
		let secret
		let encryptedSecret
		let input = ''
		
		input = await ask({ 
			message,
			preset: input,
			redactAfter: true,
		})
		input = input.trim()

		try{
			if(input.includes(' ')){
				if(input.split(' ').length > 13){
					encryptedSecret = mnemonicToKey(input)
				}else{
					secret = mnemonicToKey(input)
				}
			}else{
				if(input.startsWith('es')){
					encryptedSecret = decodeEncryptedSeed(input)
				}else{
					secret = decodeSeed(input).bytes
				}
			}
		}catch(error){
			console.log(red(`malformed key: ${error.message} - try again`))
			continue
		}

		if(encryptedSecret){
			while(true){
				let passphrase = await ask({
					message: `enter protection passphrase: `,
					redactAfter: true
				})

				try{
					secret = decrypt({
						payload: encryptedSecret,
						passphrase
					})
					encodeSeed(secret, 'ed25519')
					break
				}catch(error){
					console.log(red(`wrong passphrase: ${error.message} - try again`))
				}
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
		cipher.update(payload), 
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