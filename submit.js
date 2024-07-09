import { connect } from './net.js'
import { askPayload } from './terminal.js'

export async function submit({ payload }){
	if(!payload)
		payload = await askPayload({ message: 'enter payload to submit:' })

	let socket = await connect()

	console.log('submitting...')

	try{
		let result = await socket.request({
			command: 'submit',
			tx_blob: payload
		})

		console.log(`${result.engine_result === 'tesSUCCESS' ? '\x1b[32m' : '\x1b[33m'}submitted: ${result.engine_result}\n${result.engine_result_message}\x1b[0m`)
		console.log(`transaction hash: ${result.tx_json.hash}`)
		process.exit(0)
	}catch(error){
		console.log(`\x1b[31msubmission failed!\x1b[0m`)

		if(error.error)
			console.error(`reason: ${error.error_message} (code ${error.error_code})`)
		else
			console.error(error)

		console.log('exiting')
		process.exit(1)
	}
}