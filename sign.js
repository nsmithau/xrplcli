import { sign as libSignTx } from '@xrplkit/submit'
import { encode, decode } from 'ripple-binary-codec'
import { askChoice, askPayload, red } from './terminal.js'
import { askSecret } from './wallet.js'
import { submit } from './submit.js'
import { printQR } from './qr.js'
import { mnemonicToTx } from './tx.js'


export async function sign({ }){
	let preset

	while(true){
		let tx
		let { txJson, txBlob, txMnemonic } = await askPayload({
			message: `enter payload to sign: `,
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
			console.log(JSON.stringify(tx, null, 4))
			console.log('==============================')
			console.log('')
		}

		return await signTx({ tx })
	}
}

export async function signTx({ tx }){
	let credentails = await askSecret({ message: 'enter secret key to sign: ' })
	let signed

	try{
		signed = await libSignTx({ tx, ...credentails })
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
			message: 'proceed with signed transaction',
			options: {
				qr: 'print blob as QR code',
				submit: 'submit to network',
				exit: 'exit',
			}
		})
	
		switch(nextAction){
			case 'qr': {
				await printQR({ blob: signedBlob })
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