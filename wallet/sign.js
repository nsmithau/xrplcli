import { encode, decode, Wallet } from 'xrpl'
import { askChoice, ask, cyan, red, green } from '../util/terminal.js'
import { askSecret } from './credentials.js'
import { submit } from '../tx/submit.js'
import { printQR } from '../util/qr.js'
import { mnemonicToTx } from '../tx/create.js'


export async function sign({ tx }){
	if (!tx) {
		tx = await ask({
			message: `transaction to sign`,
			hint: `(json, hex or mnemonic)`,
			multiline: true,
			required: true,
			parse: input => {
				if (!input) {
					console.error('No input provided to parse')
					throw 'no input provided'
				}
				
				input = input.trim()
				console.log('Parsing transaction input:', input)

				if(input.startsWith('{')){
					try{
						var json = JSON.parse(input)
						console.log('Parsed JSON:', json)
					}catch(error){
						console.error('JSON parse error:', error)
						throw `not valid json`
					}
					try{
						return decode(encode(json))
					}catch(error){
						console.error('Transaction decode error:', error)
						throw `malformed tx: ${error.message}`
					}
				}else if(/^[0-9A-F]+$/.test(input.toUpperCase())){
					try{
						return decode(input)
					}catch(error){
						throw `malformed blob: ${error.message}`
					}
				}else{
					try{
						return decode(mnemonicToTx(input).toString('hex'))
					}catch(error){
						throw `bad mnemonic: ${error.message}`
					}
				}
			}
		})
	}

	console.log(`====== SIGNABLE PAYLOAD ======`)
	console.log(cyan(JSON.stringify(tx, null, 4)))
	console.log(`==============================`)
	console.log(``)

	return await signTx({ tx })
}

export async function signTx({ tx }){
	if (!tx) {
		console.error('No transaction provided to signTx')
		return
	}

	console.log('Signing transaction:', JSON.stringify(tx, null, 2))
	let credentials = await askSecret({ message: `secret key to sign` })
	let signed
	try{
		console.log('Creating wallet with credentials...')
		const wallet = Wallet.fromSeed(credentials.seed, { algorithm: 'ed25519' })
		console.log('Wallet created successfully')
		
		console.log('Signing transaction...')
		signed = wallet.sign(tx)
		console.log('Successfully signed transaction')
		console.log('Signed transaction:', signed)
	}catch(error){
		console.error('Signing error:', error)
		console.log(red(`failed to sign: ${error.message}`))
		return
	}

	let signedJson = JSON.stringify(signed, null, 4)
	let signedBlob = encode(signed)

	console.log(`${green(`√`)} signed as ${credentials.address}`)
	console.log()
	console.log(`signed blob:\n${cyan(signedBlob)}`)
	console.log()
	console.log(`signed json:\n${cyan(signedJson)}`)

	while(true){
		console.log()

		let nextAction = await askChoice({
			message: 'proceed with signed transaction',
			options: {
				submit: 'submit to network',
				qr: 'print blob as QR code'
			}
		})
	
		switch(nextAction){
			case 'submit': {
				await submit({ blob: signedBlob })
				return
			}

			case 'qr': {
				await printQR({ blob: signedBlob })
				break
			}
		}
	}
}