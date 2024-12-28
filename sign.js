import { sign as libSignTx } from '@xrplkit/submit'
import { encode, decode } from 'ripple-binary-codec'
import { askChoice, askPayload, cyan, red } from './terminal.js'
import { askSecret } from './wallet.js'
import { submit } from './submit.js'
import { printQR } from './qr.js'
import { mnemonicToTx } from './tx.js'


export async function sign({ }){
	let preset

	while(true){
		let tx
		let { txJson, txBlob, txMnemonic } = await askPayload({
			message: `payload to sign`,
			hint: `(json, hex or mnemonic)`,
			preset
		})

		if(txJson){
			tx = txJson
		}else if(txBlob){
			// todo
		}else if(txMnemonic){
			try{
				tx = mnemonicToTx(txMnemonic)
				tx = decode(tx.toString('hex'))
			}catch(error){
				console.log(red(`bad mnemonic: ${error.message} - try again`))
				preset = txMnemonic
				continue
			}

			console.log('')
			console.log('====== SIGNABLE PAYLOAD ======')
			console.log(cyan(JSON.stringify(tx, null, 4)))
			console.log('==============================')
			console.log('')
		}

		return await signTx({ tx })
	}
}

export async function signTx({ tx }){
	let credentails = await askSecret({ message: 'secret key to sign' })
	let signed

	try{
		signed = await libSignTx({ tx, ...credentails })
	}catch(error){
		console.log(red(`failed to sign: ${error.message}`))
		return
	}

	let signedJson = JSON.stringify(signed, null, 4)
	let signedBlob = encode(signed)

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