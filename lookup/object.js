import { ask, presentTask } from '../util/terminal.js'
import { connect } from '../util/net.js'


export async function lookupObject({ index }){
	let object

	if(!index){
		index = await ask({
			message: `ledger object index (hex):`,
			required: true,
			validate: input => /[0-9A-F]{64}/.test(input)
				? true
				: `not a valid 64-character hex string`
		})
	}

	await presentTask({
		message: `looking up ledger object`,
		execute: async () => {
			let socket = await connect()
			var result = await socket.request({
				command: 'ledger_entry',
				index
			})

			object = result.node
		}
	})

	console.log(``)
	console.log(object)
}