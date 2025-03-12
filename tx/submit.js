import { encode } from 'xrpl'
import { connect } from '../util/net.js'
import { presentTask, green, red } from '../util/terminal.js'

export async function submit({ blob }){
	if (!blob || typeof blob !== 'string') {
		throw new Error('Transaction blob must be a non-empty string')
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
	console.log(`engine result: ${result.engine_result.startsWith('tes') ? green(result.engine_result) : red(result.engine_result)}`)
	console.log(result.engine_result_message)
	
	if(result.kept || result.queued || result.broadcast)
		console.log(`hash: ${result.tx_json.hash}`)
}