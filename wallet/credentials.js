import { createHash } from 'crypto'
import { deriveAddress, derivePublicKey } from '@xrplkit/wallet'
import { ask } from '../util/terminal.js'
import { mnemonicToKey } from './rfc1751.js'
import { decodeSeed, encodeSeed } from 'ripple-address-codec'

export async function askSecret({ message = `secret key` }){
	let input = ''
	let parse = input => {
		let type
		let bytes
		let algo = 'ed25519'

		input = input.trim()

		try{
			if(input.includes(' ')){
				type = 'mnemonic'
				bytes = mnemonicToKey(input)
			}else{
				let decoded = decodeSeed(input)

				type = 'seed'
				bytes = decoded.bytes
				algo = decoded.type
			}
		}catch{
			type = 'passphrase'
			bytes = createHash('sha512')
				.update(input)
				.digest()
				.slice(0, 16)
		}

		let seed = encodeSeed(bytes, algo)

		return {
			type,
			seed,
			address: deriveAddress({ seed })
		}
	}
	
	input = await ask({
		message: input => input.length === 0
			? message
			: `${message} (${parse(input).type})`,
		hint: `(seed, mnemonic or passphrase)`,
		preset: input,
		note: input => input.length > 0
			? `  wallet address: ${parse(input).address}`
			: undefined,
		required: true,
		redactAfter: true
	})

	let { address, seed } = parse(input)

	return {
		address,
		seed
	}
}

export function deriveCredentials(input){
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