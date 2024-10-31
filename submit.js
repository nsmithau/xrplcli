import { connect } from './net.js'

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
		process.exit(0)
	}catch(error){
		console.log(`\x1b[31msubmission failed!\x1b[0m`)

		if(error.error_message)
			console.error(`reason: ${error.error_message} (${error.error})`)
		else if(error.error_exception)
			console.error(`reason: ${error.error_exception} (${error.error})`)
		else
			console.error(error)

		console.log('exiting')
		process.exit(1)
	}
}