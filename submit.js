import { decode, encode } from 'ripple-binary-codec'
import { connect } from './net.js'
import { askPayload, red } from './terminal.js'

export async function submit({ blob }){
	if(!blob){
		let { txJson, txBlob } = await askPayload({
			message: `tx to submit`,
			hint: `(hex or json)`
		})

		if(txJson)
			blob = encode(txJson)
		else
			blob = txBlob
	}

	let socket = await connect()

	process.stdout.write('submitting... ')

	try{
		let result = await socket.request({
			command: 'submit',
			tx_blob: blob
		})

		console.log(`${result.engine_result}`)
		console.log(result.engine_result_message)

		if(result.kept || result.queued || result.broadcast)
			console.log(`hash: ${result.tx_json.hash}`)
	}catch(error){
		if(error.error){
			console.log(red(error.error))
			console.log(error.error_message || error.error_exception)
		}else{
			console.log(red('error'))
			console.log(red(error.message || error))
		}
	}
}