import { encode } from 'ripple-binary-codec'
import { connect } from './net.js'
import { askPayload, presentTask, green, red } from './terminal.js'

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

	let result

	await presentTask({
		message: `connecting`,
		execute: async ctx => {
			let socket = await connect()

			ctx.indicator.text = `submitting transaction to ${socket.url}`

			try{
				result = await socket.request({
					command: 'submit',
					tx_blob: blob
				})
			}catch(error){
				if(error.error){
					throw new Error(`${socket.url} responded with: ${red(error.error)} - ${error.error_message || error.error_exception}`)
				}else{
					throw error
				}
			}
		}
	})

	console.log(``)
	console.log(`engine result: ${green(result.engine_result)}`)
	console.log(result.engine_result_message)
	
	if(result.kept || result.queued || result.broadcast)
		console.log(`hash: ${result.tx_json.hash}`)
}