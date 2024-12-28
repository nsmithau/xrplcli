import { isValidClassicAddress } from 'ripple-address-codec'
import { decode, encode } from 'ripple-binary-codec'
import { askChoice, askConfirm, askForm, askSelection, cyan, presentTask, red } from './terminal.js'
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
		description: `modifies the properties of an account in the XRP Ledger`,
		fields: [
			{
				key: 'SetFlag',
				type: 'UInt32',
				optional: true
			}
		]
	},
	AccountDelete: {
		description: `deletes an account and any objects it owns in the XRP Ledger, if possible, sending the account's remaining XRP to a specified destination account`,
		fields: [
			{
				key: 'Destination',
				type: 'AccountID'
			},
			{
				key: 'DestinationTag',
				type: 'UInt32',
				optional: true
			}
		]
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
		description: `gives another account pre-approval to deliver payments to the sender of this transaction`,
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
		description: `places an Offer in the decentralized exchange`,
		fields: [
			{
				key: 'TakerGets',
				type: 'Amount'
			},
			{
				key: 'TakerPays',
				type: 'Amount'
			}
		],
		flags: [
			{
				name: 'tfPassive',
				value: 0x00010000
			},
			{
				name: 'tfImmediateOrCancel',
				value: 0x00020000
			},
			{
				name: 'tfFillOrKill',
				value: 0x00040000
			},
			{
				name: 'tfSell',
				value: 0x00080000
			}
		]
	},
	OfferCancel: {
		description: `removes an Offer object from the XRP Ledger`,
		fields: [
			{
				key: 'OfferSequence',
				type: 'UInt32'
			}
		]
	},
	Payment: {
		description: `represents a transfer of value from one account to another`,
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
		],
		flags: [
			{
				name: 'tfNoRippleDirect',
				value: 0x00010000
			},
			{
				name: 'tfPartialPayment',
				value: 0x00020000
			},
			{
				name: 'tfLimitQuality',
				value: 0x00040000
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
		description: `assigns, changes, or removes the regular key pair associated with an account`,
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
		description: `creates or modifies a trust line linking two accounts`,
		fields: [
			{
				key: 'LimitAmount',
				type: 'Amount'
			}
		],
		flags: [
			{
				name: 'tfSetfAuth',
				value: 0x00010000
			},
			{
				name: 'tfSetNoRipple',
				value: 0x00020000
			},
			{
				name: 'tfClearNoRipple',
				value: 0x00040000
			},
			{
				name: 'tfSetFreeze',
				value: 0x00100000
			},
			{
				name: 'tfClearFreeze',
				value: 0x00200000
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

			tx.Flags = spec.flags
				.filter(flag => flags.includes(flag.name))
				.reduce((v, f) => v | f.value, 0)
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