import { sign as libSignTx } from '@xrplkit/submit'
import { encode } from 'ripple-binary-codec'
import { askChoice, askJSON, askMnemonic } from './terminal.js'
import { askSecret } from './wallet.js'
import { submit } from './submit.js'


export async function sign({ format }){
	if(!format){
		console.log()
		
		format = await askChoice({
			message: 'what to sign?',
			options: {
				tx_json: 'transaction (json)',
				tx_blob: 'transaction (blob)',
				tx_mnemonic: 'transaction (mnemonic)',
				msg_txt: 'message (text)',
				msg_blob: 'message (blob)'
			}
		})
	}

	switch(format){
		case 'tx_json': {
			return await signTx({
				tx: await askJSON({
					message: 'transaction to sign (json): '
				})
			})
		}
		case 'tx_mnemonic': {
			return await signTx({
				tx: await askMnemonic({
					message: 'transaction to sign (mnemonic): ',
					type: 'tx'
				})
			})
		}
	}
}

async function signTx({ tx }){
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
			message: 'how to proceed?',
			options: {
				qr: 'print QR code',
				submit: 'submit to network',
				exit: 'exit',
			}
		})
	
		switch(nextAction){
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