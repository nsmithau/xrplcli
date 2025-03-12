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

	let credentials = await askSecret({ message: `secret key to sign` })
	let signed
	try{
		// Create wallet from seed
		const wallet = Wallet.fromSeed(credentials.seed)
		
		// Make sure account field is set if not already
		if (!tx.Account) {
			tx.Account = wallet.classicAddress
		}
		
		// Sign the transaction
		signed = wallet.sign(tx)
		console.log('Transaction signed successfully')
	}catch(error){
		console.error('Signing error:', error)
		console.log(red(`failed to sign: ${error.message}`))
		return
	}

	// Use try/catch for encoding
	let signedBlob
	try {
		signedBlob = signed.tx_blob
		console.log('Generated blob length:', signedBlob.length)
	} catch (error) {
		console.error('Encoding error:', error)
		console.log(red(`failed to get transaction blob: ${error.message}`))
		return
	}

	console.log(`${green(`√`)} signed as ${credentials.address}`)

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
				try {
					await submit({ blob: signedBlob })
				} catch (error) {
					console.error('Submit error:', error)
					console.log(red(`failed to submit: ${error.message}`))
				}
				return
			}

			case 'qr': {
				await printQR({ blob: signedBlob })
				break
			}
		}
	}
}