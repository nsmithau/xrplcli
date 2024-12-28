import createSocket from '@xrplkit/socket'

let nodeUrl = 'wss://s1.ripple.com'
let socket

export function useNode({ url }){
	nodeUrl = url
}

export async function connect({ url = nodeUrl } = {}){
	if(socket && socket.connected)
		return socket

	socket = createSocket({ url, apiVersion: 2 })

	await new Promise((resolve, reject) => {
		socket.on('open', resolve)
		socket.on('error', reject)
	})

	return socket
}