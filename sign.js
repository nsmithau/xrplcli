import clipboard from 'clipboardy'
import { sign as signTx } from '@xrplkit/submit'
import { encode } from 'ripple-binary-codec'
import { askChoice, askJSON } from './terminal.js'
import { askSecret } from './wallet.js'
import { submit } from './submit.js'

export async function sign({ tx }){
	if(!tx)
		tx = await askJSON({ message: 'transaction to sign (json): ' })

	let credentails = await askSecret({ message: 'enter secret key to sign: ' })
	let signed

	try{
		signed = await signTx({ tx, ...credentails })
	}catch(error){
		console.log(error)
	}

	let signedJson = JSON.stringify(signed, null, 4)
	let signedBlob = encode(signed)

	console.log()
	console.log(`signed blob:\n${signedBlob}`)
	console.log()
	console.log(`signed json:\n${signedJson}`)
	console.log()



	while(true){
		let nextAction = await askChoice({
			message: 'how to proceed?',
			options: {
				clipboardBlob: 'copy blob to clipboard',
				clipboardJson: 'copy json to clipboard',
				qr: 'print QR code',
				submit: 'submit to network',
				exit: 'exit',
			}
		})
	
		switch(nextAction){
			case 'clipboardBlob': {
				clipboard.writeSync(signedBlob)
				console.log('copied blob to clipboard!\n')
				break
			}

			case 'clipboardJson': {
				clipboard.writeSync(signedJson)
				console.log('copied json to clipboard!\n')
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