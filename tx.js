import clipboard from 'clipboardy'
import { sign as signTx } from '@xrplkit/submit'
import { encode } from 'ripple-binary-codec'
import { askChoice, askJSON } from './terminal.js'
import { askSecret } from './wallet.js'
import { submit } from './submit.js'

export async function sign({ tx }){
	if(!tx)
		tx = await askJSON({ message: 'enter payload to sign:' })

	let credentails = await askSecret({ message: 'enter secret key to sign:' })
	let signed

	try{
		signed = await signTx({ tx, ...credentails })
	}catch(error){
		console.log(error)
	}

	let signedJson = JSON.stringify(signed, null, 4)
	let signedBlob = encode(signed)

	console.log('successfully signed!')
	console.log(`\n-----BEGIN SIGNED TX BLOB-----\n\x1b[36m${signedBlob}\x1b[0m\n-----END SIGNED TX BLOB-----\n`)
	console.log(`\n-----BEGIN SIGNED TX JSON-----\n\x1b[36m${signedJson}\x1b[0m\n-----END SIGNED TX JSON-----\n`)

	while(true){
		let nextAction = await askChoice({
			message: 'how to proceed?',
			choices: {
				clipboardJson: 'copy json to clipboard',
				clipboardBlob: 'copy blob to clipboard',
				qr: 'print QR code',
				submit: 'submit tx to network',
				exit: 'exit',
			}
		})
	
		switch(nextAction){
			case 'clipboardJson': {
				clipboard.writeSync(signedJson)
				console.log('copied json to clipboard!\n')
				break
			}

			case 'clipboardBlob': {
				clipboard.writeSync(signedBlob)
				console.log('copied blob to clipboard!\n')
				break
			}

			case 'submit': {
				await submit({ payload: signedBlob })
				return
			}
	
			case 'exit': {
				console.log('bye')
				process.exit(0)
			}
		}
	}
}