import { isValidClassicAddress } from 'ripple-address-codec'
import { decode, encode } from 'ripple-binary-codec'
import { ask, askChoice, askConfirm, askForm, cyan, red } from './terminal.js'
import { parseAmount } from './utils.js'
import { connect } from './net.js'
import { signTx } from './sign.js'
import { bufferToMnemonic, mnemonicToBuffer } from './rfc1751.js'

const txCommonSpec = {
	fields: [
		{
			key: 'Account',
			type: 'AccountID'
		},
		{
			key: 'Sequence',
			type: 'UInt32',
			autofillable: true
		},
		{
			key: 'Fee',
			type: 'Amount',
			autofillable: true
		}
	],
	flags: []
}

const txSpec = {
	AccountSet: {
		fields: [
			{
				key: 'SetFlag',
				type: 'UInt32',
				optional: true
			}
		]
	},
	AccountDelete: {
		fields: []
	},
	AMMBid: {
		fields: []
	},
	AMMCreate: {
		fields: []
	},
	AMMDelete: {
		fields: []
	},
	AMMDeposit: {
		fields: []
	},
	AMMVote: {
		fields: []
	},
	AMMWithdraw: {
		fields: []
	},
	CheckCancel: {
		fields: []
	},
	CheckCash: {
		fields: []
	},
	CheckCreate: {
		fields: []
	},
	Clawback: {
		fields: []
	},
	DepositPreauth: {
		fields: [
			{
				key: 'Authorize',
				type: 'AccountID',
				optional: true
			},
			{
				key: 'Deauthorize',
				type: 'AccountID',
				optional: true
			}
		]
	},
	DIDDelete: {
		fields: []
	},
	DIDSet: {
		fields: []
	},
	EscrowCancel: {
		fields: []
	},
	EscrowCreate: {
		fields: []
	},
	EscrowFinish: {
		fields: []
	},
	NFTokenAcceptOffer: {
		fields: []
	},
	NFTokenBurn: {
		fields: []
	},
	NFTokenCancelOffer: {
		fields: []
	},
	NFTokenCreateOffer: {
		fields: []
	},
	NFTokenMint: {
		fields: []
	},
	OfferCreate: {
		fields: [
			{
				key: 'TakerGets',
				type: 'Amount'
			},
			{
				key: 'TakerPays',
				type: 'Amount'
			}
		]
	},
	OfferCancel: {
		fields: [
			{
				key: 'OfferSequence',
				type: 'UInt32'
			}
		]
	},
	Payment: {
		fields: [
			{
				key: 'Destination',
				type: 'AccountID'
			},
			{
				key: 'DestinationTag',
				type: 'UInt32',
				optional: true
			},
			{
				key: 'Amount',
				type: 'Amount'
			},
			{
				key: 'DeliverMin',
				type: 'Amount',
				optional: true
			},
			{
				key: 'SendMax',
				type: 'Amount',
				optional: true
			}
		]
	},
	PaymentChannelClaim: {
		fields: []
	},
	PaymentChannelCreate: {
		fields: []
	},
	PaymentChannelFund: {
		fields: []
	},
	SetRegularKey: {
		fields: [
			{
				key: 'RegularKey',
				type: 'AccountID',
				optional: true
			}
		]
	},
	SignerListSet: {
		fields: []
	},
	TicketCreate: {
		fields: []
	},
	TrustSet: {
		fields: [
			{
				key: 'LimitAmount',
				type: 'Amount'
			}
		]
	}
}

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
		fields: [...txSpec[type].fields, ...txCommonSpec.fields],
		flags: [...(txSpec[type]?.flags || []), ...txCommonSpec.flags]
	}
	let requiredFieldsCount = spec.fields.reduce((count, field) => count + !!(field.optional || field.autofillable), 0)
	let optionalFieldsCount = spec.fields.length - requiredFieldsCount

	console.log(`${cyan(type)} transaction has ${requiredFieldsCount} required and ${optionalFieldsCount} optional field(s)`)
	console.log(`use arrow keys to navigate the form below`)

	let tx = {}
	let blob

	while(true){
		tx = await askForm({
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

		let needsAutofill = spec.fields.some(field => field.autofillable && tx[field.key] === undefined)

		if(needsAutofill){
			console.log('autofilling optional fields...')

			let socket = await connect()

			if(!tx.Sequence){
				console.log(`reading account sequence of ${tx.Account}... `)

				let { account_data } = await socket.request({
					command: 'account_info',
					account: tx.Account
				})

				tx.Sequence = account_data.Sequence
			}

			if(!tx.Fee){
				console.log(`reading open ledger fee... `)

				let { drops } = await socket.request({
					command: 'fee'
				})
	
				tx.Fee = (parseInt(drops.open_ledger_fee) + 2).toString()
			}

			socket.close()
		}

		blob = encode({ TransactionType: type, ...tx })
		tx = decode(blob)
	
		console.log('')
		console.log('======= PLEASE CONFIRM =======')
		console.log(cyan(JSON.stringify(tx, null, 4)))
		console.log('==============================')
		console.log('')
	
	
		if(await askConfirm({ message: 'are the above details correct?' })){
			break
		}
	}

	if(await askConfirm({ message: 'sign now?' })){
		await signTx({ tx })
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
		case 'UInt32': 
			return !/^[0-9]+$/.test(input)
				&& 'not a valid integer number'
		case 'Amount': {
				try{
					parseAmount(input)
				}catch(error){
					return `${error.message}`
				}
			break
		}
	}
}

function parseFieldInput(input, type){
	switch(type){
		case 'UInt32': {
			input = parseInt(input)
			break
		}
		case 'Amount': {
			input = parseAmount(input)
			break
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