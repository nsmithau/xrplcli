import qrcode from 'qrcode-terminal'
import { ask } from './terminal.js'


export async function printQR({ blob }){
	let parts = await ask({
		message: 'split into multiple QR codes (1-4): ',
		validate: input => parseInt(input) >= 1 && parseInt(input) <= 4
			? true
			: 'must be between 1 and 4 parts - try again'
	})
	let chunk = Math.ceil(blob.length / parseInt(parts))
	let offset = 0
	let i = 0

	while(++i){
		qrcode.generate(blob.slice(offset, offset + chunk), {small: true})

		offset += chunk

		if(offset >= blob.length){
			console.log(`part ${i} of ${parts}`)
			break
		}else{
			await ask({ message: `part ${i} of ${parts} - press enter for next` })
		}
	}
}