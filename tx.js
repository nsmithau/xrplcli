import { isValidClassicAddress } from 'ripple-address-codec'
import { encode } from 'ripple-binary-codec'
import { ask, askChoice, askConfirm, cyan, red } from './terminal.js'
import { parseAmount } from './utils.js'
import { connect } from './net.js'
import { signTx } from './sign.js'
import { bufferToMnemonic, mnemonicToBuffer } from './rfc1751.js'

const txCommonSpec = {
	fields: {
		Account: {
			type: 'AccountID'
		}
	}
}

const txSpec = {
	AccountSet: {},
	AccountDelete: {},
	AMMBid: {},
	AMMCreate: {},
	AMMDelete: {},
	AMMDeposit: {},
	AMMVote: {},
	AMMWithdraw: {},
	CheckCancel: {},
	CheckCash: {},
	CheckCreate: {},
	Clawback: {},
	DepositPreauth: {},
	DIDDelete: {},
	DIDSet: {},
	EscrowCancel: {},
	EscrowCreate: {},
	EscrowFinish: {},
	NFTokenAcceptOffer: {},
	NFTokenBurn: {},
	NFTokenCancelOffer: {},
	NFTokenCreateOffer: {},
	NFTokenMint: {},
	OfferCancel: {},
	OfferCreate: {},
	Payment: {
		fields: {
			Destination: {
				type: 'AccountID'
			},
			DestinationTag: {
				type: 'UInt32',
				optional: true
			},
			Amount: {
				type: 'Amount'
			},
			DeliverMin: {
				type: 'Amount',
				optional: true
			},
			SendMax: {
				type: 'Amount',
				optional: true
			}
		}
	},
	PaymentChannelClaim: {},
	PaymentChannelCreate: {},
	PaymentChannelFund: {},
	SetRegularKey: {},
	SignerListSet: {},
	TicketCreate: {},
	TrustSet: {},
}


export async function createTx({ type }){
	if(!type){
		type = await askChoice({
			message: 'transaction type',
			options: Object.keys(txSpec).reduce((acc, key) => ({ ...acc, [key] : key }), {})
		})
	}

	let spec = txSpec[type]
	let requiredFieldsCount = Object.entries(spec.fields).reduce(
		(count, [key, spec]) => count + !!spec.optional,
		Object.keys(txCommonSpec.fields).length
	)

	console.log()
	console.log(`${cyan(type)} transaction requires ${requiredFieldsCount} fields`)
	console.log(`press CTRL+C to correct previous field`)
	console.log()

	let data = {}
	let askChain = [
		{ key: 'Account', ...txCommonSpec.fields.Account },
		...Object.entries(spec.fields).map(
			([key, spec]) => ({ key, ...spec })
		)
	]

	for(let i=0; i<askChain.length; i++){
		let { key, type, optional } = askChain[i]
		let preset = data[key]
		
		try{
			data[key] = await askField({ key, type, optional, preset })
		}catch(error){
			if(error.abort && i >= 1){
				console.log('\n(correcting previous)')
				i -= 2
				continue
			}

			throw error
		}
	}

	console.log('')
	
	if(await askConfirm({ message: 'auto-fill common fields?' })){
		try{
			let socket = await connect()

			process.stdout.write(`reading sequence field of ${data.Account}... `)

			let { account_data } = await socket.request({
				command: 'account_info',
				account: data.Account
			})

			data.Sequence = account_data.Sequence + 1
			console.log(data.Sequence.toString())

			process.stdout.write(`reading open ledger fee... `)

			let { drops } = await socket.request({
				command: 'fee'
			})

			data.Fee = (parseInt(drops.open_ledger_fee) + 2).toString()
			console.log(data.Fee)

			socket.close()
		}catch(error){
			console.log(red(`error during auto-filling: ${error.message}`))
			console.log('defaulting to manual input of common fields')
		}
	}

	if(!data.Sequence || !data.Fee){
		console.log('')

		// todo
	}

	let tx
	let blob

	while(true){
		tx = { TransactionType: type, ...data }
		blob = encode(tx)
	
		console.log('')
		console.log('======= PLEASE CONFIRM =======')
		console.log(JSON.stringify(tx, null, 4))
		console.log('==============================')
		console.log('')
	
	
		if(!await askConfirm({ message: 'are the above details correct?' })){
			// todo
		}

		break
	}

	if(await askConfirm({ message: 'sign now?' })){
		await signTx({ tx })
		return
	}

	console.log()
	console.log(`transaction json:\n${JSON.stringify(tx, null, 4)}`)
	console.log()
	console.log(`transaction blob:\n${blob}`)
	console.log()
	console.log(`transaction mnemonic:\n${txToMnemonic(Buffer.from(blob, 'hex'))}`)
}

async function askField({ key, type, optional, preset }){
	let message = optional ? `${key} (optional): ` : `${key}: `
	let validate

	switch(type){
		case 'AccountID': {
			validate = input => !isValidClassicAddress(input)
				&& 'not a valid r-address - try again'
			break
		}
		case 'UInt32': {
			validate = input => !/^[0-9]+$/.test(input)
				&& 'not a valid integer number - try again'
			break
		}
		case 'Amount': {
			validate = input => {
				try{
					parseAmount(input)
				}catch(error){
					return `${error.message} - try again`
				}
			}
			break
		}
	}

	if(optional && validate){
		let validateRequired = validate

		validate = input => input.length === 0
			? undefined
			: validateRequired(input)
	}

	let value = await ask({ message, preset, validate })

	if(optional && !value)
		return

	switch(type){
		case 'UInt32': {
			value = parseInt(value)
			break
		}
		case 'Amount': {
			value = parseAmount(value)
			break
		}
	}

	return value
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