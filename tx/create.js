import { isValidClassicAddress } from 'xrpl'
import { decode, encode } from 'xrpl'
import { askChoice, askConfirm, askForm, askSelection, cyan, presentTask, red } from '../util/terminal.js'
import { parseAmount, parseToken } from '../util/parsing.js'
import { connect } from '../util/net.js'
import { signTx } from '../wallet/sign.js'
import { bufferToMnemonic, mnemonicToBuffer } from '../wallet/rfc1751.js'
import { txCommonSpec, txSpec } from './spec.js'


export async function createTx({ type }){
	if(!type){
		type = await askChoice({
			message: 'transaction type',
			options: Object.keys(txSpec).reduce((acc, key) => ({ ...acc, [key] : key }), {})
		})
		console.log(``)
	}else if(!txSpec[type]){
		let matchedType = Object.keys(txSpec).find(key => key.toLowerCase() === type.toLowerCase())

		if(matchedType)
			type = matchedType
		else
			throw `no transaction type "${type}"`
	}

	let spec = {
		description: txSpec[type].description,
		fields: [...txSpec[type].fields, ...txCommonSpec.fields],
		flags: [...(txSpec[type]?.flags || []), ...txCommonSpec.flags]
	}

	console.log(`${cyan(type)} transaction ${spec.description}.`)
	console.log(`use arrow keys to navigate the form below`)

	let tx = {}
	let blob

	while(true){
		console.log(``)

		tx = await askForm({
			message: `transaction fields`,
			fields: [
				spec.fields.find(field => field.key === 'Account'),
				...spec.fields.filter(field => field.key !== 'Account')
			].map(
				field => ({
					name: field.key,
					hint: field.optional 
						? 'optional' 
						: field.autofillable ? 'optional (autofills)' : undefined,
					initial: tx[field.key] || '',
					validate: input => {
						if(!input || input.length === 0){
							if(field.optional || field.autofillable)
								return true
		
							return 'required'
						}
		
						return validateFieldInput(input, field.type) || true
					},
					result: input => {
						if(input.length === 0)
							return undefined
		
						return parseFieldInput(input, field.type)
					}
				})
			)
		})

		if(spec.flags.length > 0){
			let flags = await askSelection({
				message: `transaction flags`,
				fields: spec.flags.map(
					flag => ({
						name: flag.name,
						initial: !!((tx.Flags || 0) & spec.value)
					})
				)
			})

			if(flags.length > 0){
				tx.Flags = spec.flags
					.filter(flag => flags.includes(flag.name))
					.reduce((v, f) => v | f.value, 0)
			}else{
				delete tx.Flags
			}
		}

		let needsAutofill = spec.fields.some(field => field.autofillable && tx[field.key] === undefined)

		if(needsAutofill){
			try{
				await presentTask({
					message: `autofilling optional fields`,
					execute: async () => {
						let socket = await connect()
	
						if(!tx.Sequence){
							let { account_data } = await socket.request({
								command: 'account_info',
								account: tx.Account
							})
	
							tx.Sequence = account_data.Sequence
						}
	
						if(!tx.Fee){
							let { drops } = await socket.request({
								command: 'fee'
							})
				
							tx.Fee = (parseInt(drops.open_ledger_fee) + 2).toString()
						}
	
						socket.close()
					}
				})
			}catch(error){
				console.log(``)
				console.log(red(`cannot autofill due to error: ${error.message || error.error_message || error}`))
				console.log(`please fill fields manually`)
				continue
			}
		}

		blob = encode({ TransactionType: type, ...tx })
		tx = decode(blob)
	
		console.log(``)
		console.log(`======= PLEASE CONFIRM =======`)
		console.log(cyan(JSON.stringify(tx, null, 4)))
		console.log(`==============================`)
		console.log(``)
	
	
		if(await askConfirm({ message: 'are the above details correct?' })){
			break
		}
	}

	if(await askConfirm({ message: 'sign now?' })){
		console.log('Transaction to sign:', JSON.stringify(tx, null, 2))
		try {
			await signTx({ 
				tx: {
					...tx,
					TransactionType: type
				}
			})
		} catch (error) {
			console.error('Error during signing:', error)
		}
		return
	}

	console.log()
	console.log(`transaction json:\n${cyan(JSON.stringify(tx, null, 4))}`)
	console.log()
	console.log(`transaction blob:\n${cyan(blob)}`)
	console.log()
	console.log(`transaction mnemonic:\n${cyan(txToMnemonic(Buffer.from(blob, 'hex')))}`)
}

function validateFieldInput(input, type){
	switch(type){
		case 'AccountID': 
			return !isValidClassicAddress(input)
				&& 'not a valid r-address'
		case 'UInt8': 
		case 'UInt16': 
		case 'UInt32': 
			return !/^[0-9]+$/.test(input)
				&& 'not a valid integer number'
		case 'Amount': {
				try{
					if(typeof input === 'string')
						parseAmount(input)
				}catch(error){
					return `${error.message}`
				}
			break
		}
		case 'STIssue': {
				try{
					if(typeof input === 'string')
						parseToken(input)
				}catch(error){
					return `${error.message}`
				}
			break
		}
		case 'Hash256': {
			if(!/[0-9A-f]{64}/.test(input))
				return `not a valid 64-character hex string`
		}
	}
}

function parseFieldInput(input, type){
	switch(type){
		case 'UInt8':
		case 'UInt16':
		case 'UInt32': {
			input = parseInt(input)
			break
		}
		case 'Amount': {
			try { input = parseAmount(input) } catch {}
			break
		}
		case 'STIssue': {
			try { input = parseToken(input) } catch {}
			break
		}
		case 'Blob': {
			if(/[0-9A-F]+/.test(input))
				return input
			else
				return Buffer.from(input)
					.toString('hex')
					.toUpperCase()
		}
	}

	return input
}

export function txToMnemonic(blob){
	let checksum = new Uint8Array(blob).reduce((a, b) => (a + b) & 0xff, 0)

	return bufferToMnemonic(
		Buffer.concat([Buffer.from([checksum]), blob])
	)
}

export function mnemonicToTx(mnemonic){
	let buffer = mnemonicToBuffer(mnemonic)
	let blob = buffer.subarray(1)
	let checksum = new Uint8Array(blob).reduce((a, b) => (a + b) & 0xff, 0)

	if(checksum !== buffer[0])
		throw new Error(`mnemonic has bad checksum`)

	return blob
}