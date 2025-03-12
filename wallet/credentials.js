import { createHash } from 'crypto'
import { Wallet } from 'xrpl'
import rippleAddressCodec from 'ripple-address-codec'
import { ask } from '../util/terminal.js'
import { mnemonicToKey } from './rfc1751.js'

export async function askSecret({ message = `secret key` }){
	function parse(input) {
		try {
			console.log('Processing input...')
			const result = deriveCredentials(input)
			if (result) {
				return result
			}
			throw new Error('Failed to derive credentials')
		} catch(error) {
			throw error
		}
	}

	let result
	const input = await ask({
		message,
		hint: `(seed, mnemonic or passphrase)`,
		validate: input => {
			try {
				result = parse(input.trim())
				return true
			} catch(error) {
				return error.message
			}
		},
		required: true,
		redactAfter: true
	})

	return result
}

export function deriveCredentials(input){
	if(input.includes(' ')){
		try{
			const bytes = mnemonicToKey(input)
			const seedHex = Buffer.from(bytes).toString('hex').toUpperCase()
			const wallet = Wallet.fromSeed(seedHex)
			return {
				seed: seedHex,
				address: wallet.classicAddress,
				publicKey: wallet.publicKey
			}
		}catch(error){
			console.error('Failed to derive from mnemonic:', error.message)
		}
	}else{
		let errors = []
		// Try Ed25519 seed first
		if (input.startsWith('sEd')) {
			try {
				// Try decoding the Ed25519 seed first
				const decoded = rippleAddressCodec.decodeSeed(input, 'ed25519')
				
				// Convert to hex and try creating wallet
				const entropy = Buffer.from(decoded.bytes).toString('hex').toUpperCase()
				const wallet = Wallet.fromEntropy(entropy, { algorithm: 'ed25519' })
				return {
					seed: input,
					address: wallet.classicAddress,
					publicKey: wallet.publicKey
				}
			} catch(e) {
				errors.push(`Failed to handle Ed25519 seed: ${e.message}`)
				
				// Try alternative Ed25519 method
				try {
					const wallet = Wallet.fromSeed(input, { algorithm: 'ed25519' })
					return {
						seed: input,
						address: wallet.classicAddress,
						publicKey: wallet.publicKey
					}
				} catch(e2) {
					errors.push(`Failed alternative Ed25519 method: ${e2.message}`)
				}
			}
		}

		// Try regular seed
		try{
			const wallet = Wallet.fromSeed(input)
			return {
				seed: input,
				address: wallet.classicAddress,
				publicKey: wallet.publicKey
			}
		}catch(error){
			errors.push(`Failed to parse as regular seed: ${error.message}`)
		}
	
		try{
			const wallet = Wallet.fromPrivateKey(input)
			return {
				secretKey: input,
				address: wallet.classicAddress,
				publicKey: wallet.publicKey
			}
		}catch(error){
			errors.push(`Failed to parse as private key: ${error.message}`)
		}

		console.error('All attempts failed:', errors.join('\n'))
	}
	return null
}