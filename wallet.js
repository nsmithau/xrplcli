import { deriveAddress, derivePublicKey } from '@xrplkit/wallet'
import { ask } from './terminal.js'

export async function askSecret({ message }){
	let input = await ask({ 
		message: message || 'enter secret key',
		validate: input => deriveCredentials(input)
			? true
			: 'unrecognized key format - please recheck'
	})

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