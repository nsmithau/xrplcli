import { sign as libSignTx } from '@xrplkit/submit'
import { encode, decode } from 'ripple-binary-codec'
import { askChoice, ask, cyan, red, green } from './terminal.js'
import { askSecret } from './wallet.js'
import { submit } from './submit.js'
import { printQR } from './qr.js'
import { mnemonicToTx } from './tx.js'


export async function sign({ }){
	let tx = await ask({
		message: `transaction to sign`,
		hint: `(json, hex or mnemonic)`,
		multiline: true,
		required: true,
		parse: input => {
			input = input.trim()

			if(input.startsWith('{')){
				try{
					var json = JSON.parse(input)
				}catch{
					throw `not valid json`
				}
				try{
					return decode(encode(json))
				}catch(error){
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

	console.log(`====== SIGNABLE PAYLOAD ======`)
	console.log(cyan(JSON.stringify(tx, null, 4)))
	console.log(`==============================`)
	console.log(``)

	return await signTx({ tx })
}

export async function signTx({ tx }){
	let credentails = await askSecret({ message: `secret key to sign` })
	let signed

	try{
		signed = await libSignTx({ tx, ...credentails })
	}catch(error){
		console.log(red(`failed to sign: ${error.message}`))
		return
	}

	let signedJson = JSON.stringify(signed, null, 4)
	let signedBlob = encode(signed)

	console.log(`${green(`√`)} signed as ${credentails.address}`)
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