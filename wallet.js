import { deriveAddress, derivePublicKey } from '@xrplkit/wallet'
import { ask, cyan } from './terminal.js'

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