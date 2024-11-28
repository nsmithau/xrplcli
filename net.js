import createSocket from '@xrplkit/socket'

let nodeUrl = 'wss://s1.ripple.com'

export function useNode({ url }){
	nodeUrl = url
}

export async function connect({ url = nodeUrl } = {}){
	let cleanUrl = url.replace('ws://', '').replace('wss://', '')
	let socket = createSocket({ url, apiVersion: 2 })

	process.stdout.write(`connecting to ${cleanUrl}... `)

	await new Promise((resolve, reject) => {
		socket.on('open', resolve)
		socket.on('error', reject)
	})

	console.log('established')

	return socket
}