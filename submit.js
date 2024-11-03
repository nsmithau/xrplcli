import { connect } from './net.js'
import { red } from './terminal.js'

export async function submit({ payload }){
	let socket = await connect()

	console.log('submitting...')

	try{
		let result = await socket.request({
			command: 'submit',
			tx_blob: payload
		})

		console.log(`${result.engine_result_message} (${result.engine_result})`)
		console.log(`hash: ${result.tx_json.hash}`)
	}catch(error){
		if(error.error_message)
			console.error(red(`${error.error_message} (${error.error})`))
		else if(error.error_exception)
			console.error(red(`${error.error_exception} (${error.error})`))
		else
			console.error(red(error))
	}
}