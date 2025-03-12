import { isValidClassicAddress } from 'xrpl'
import { ask, presentTask } from '../util/terminal.js'
import { connect } from '../util/net.js'


export async function lookupAccount({ account }){
	if(!account){
		account = await ask({
			message: `account address:`,
			required: true,
			validate: input => isValidClassicAddress(input)
				? true
				: `not a valid r-address`
		})
	}

	let data = {}

	await presentTask({
		message: `reading account ${account}`,
		execute: async ({ indicator }) => {
			let socket = await connect()

			let { account_data } = await socket.request({
				command: 'account_info',
				account
			})

			let { account_objects } = await socket.request({
				command: 'account_objects',
				account
			})

			data.info = account_data
			data.objects = account_objects
		}
	})

	console.log(``)
	console.log(`account info:`)
	console.log(data.info)

	if(data.objects.length > 0){
		console.log(`account objects:`)
		console.log(data.objects)
	}
}