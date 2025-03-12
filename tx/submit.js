import { encode } from 'xrpl'
import { connect } from '../util/net.js'
import { presentTask, ask, green, red } from '../util/terminal.js'

export async function submit({ blob }){
	console.log('blob', blob)
	if(!blob){
		blob = await ask({ 
			message: `tx to submit (hex)`,
			required: true
		})
	}

	console.log('Submitting transaction blob:', blob)
	let result

	await presentTask({
		message: `connecting`,
		execute: async ctx => {
			let socket = await connect()

			ctx.indicator.text = `submitting transaction to ${socket.url}`
			console.log('Connected to:', socket.url)

			try{
				result = await socket.request({
					command: 'submit',
					tx_blob: blob
				})
				console.log('Submit response:', result)
			}catch(error){
				console.error('Submit error:', error)
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