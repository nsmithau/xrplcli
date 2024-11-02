import { isValidClassicAddress } from 'ripple-address-codec'
import { ask, askChoice, cyan } from './terminal.js'

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
			},
			DeliverMax: {
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
				console.log('(correcting previous)')
				i -= 2
				continue
			}

			throw error
		}
	}
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
			validate = input => !/^[0-9]$/.test(input)
				&& 'not a valid integer number - try again'
			break
		}
	}

	if(optional && validate)
		validate = input => input.length === 0
			? undefined
			: validate(input)

	let value = await ask({ message, preset, validate })

	switch(type){
		case 'UInt32': {
			value = parseInt(value)
			break
		}
	}

	return value
}