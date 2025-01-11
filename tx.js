import { isValidClassicAddress } from 'ripple-address-codec'
import { decode, encode } from 'ripple-binary-codec'
import { askChoice, askConfirm, askForm, askSelection, cyan, presentTask, red } from './terminal.js'
import { parseAmount, parseToken } from './utils.js'
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
			},
			{
				key: 'ClearFlag',
				type: 'UInt32',
				optional: true
			},
			{
				key: 'Domain',
				type: 'Blob',
				optional: true
			},
			{
				key: 'EmailHash',
				type: 'Hash128',
				optional: true
			},
			{
				key: 'MessageKey',
				type: 'Blob',
				optional: true
			},
			{
				key: 'TransferRate',
				type: 'UInt32',
				optional: true
			},
			{
				key: 'TickSize',
				type: 'UInt8',
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
		description: `bids on an Automated Market Maker's (AMM's) auction slot`,
		fields: [
			{
				key: 'Asset',
				type: 'STIssue'
			},
			{
				key: 'Asset2',
				type: 'STIssue'
			},
			{
				key: 'BidMin',
				type: 'Amount',
				optional: true
			},
			{
				key: 'BidMax',
				type: 'Amount',
				optional: true
			}
		]
	},
	AMMCreate: {
		description: `creates a new Automated Market Maker (AMM) instance for trading a pair of assets (fungible tokens or XRP)`,
		fields: [
			{
				key: 'Amount',
				type: 'Amount',
				optional: true
			},
			{
				key: 'Amount2',
				type: 'Amount',
				optional: true
			},
			{
				key: 'TradingFee',
				type: 'UInt16',
				optional: true
			}
		]
	},
	AMMDelete: {
		description: `deletes an empty Automated Market Maker (AMM) instance that could not be fully deleted automatically`,
		fields: [
			{
				key: 'Asset',
				type: 'STIssue'
			},
			{
				key: 'Asset2',
				type: 'STIssue'
			}
		]
	},
	AMMDeposit: {
		description: `deposits funds into an Automated Market Maker (AMM) instance and receive the AMM's liquidity provider tokens (LP Tokens) in exchange`,
		fields: [
			{
				key: 'Asset',
				type: 'STIssue'
			},
			{
				key: 'Asset2',
				type: 'STIssue'
			},
			{
				key: 'Amount',
				type: 'Amount',
				optional: true
			},
			{
				key: 'Amount2',
				type: 'Amount',
				optional: true
			},
			{
				key: 'EPrice',
				type: 'Amount',
				optional: true
			},
			{
				key: 'LPTokenOut',
				type: 'Amount',
				optional: true
			},
			{
				key: 'TradingFee',
				type: 'UInt16',
				optional: true
			}
		],
		flags: [
			{
				name: 'tfLPToken',
				value: 0x00010000
			},
			{
				name: 'tfTwoAsset',
				value: 0x00100000
			},
			{
				name: 'tfTwoAssetIfEmpty',
				value: 0x00800000
			},
			{
				name: 'tfSingleAsset',
				value: 0x00080000
			},
			{
				name: 'tfOneAssetLPToken',
				value: 0x00200000
			},
			{
				name: 'tfLimitLPToken',
				value: 0x00400000
			},
		]
	},
	AMMVote: {
		description: `votes on the trading fee for an Automated Market Maker instance`,
		fields: [
			{
				key: 'Asset',
				type: 'STIssue'
			},
			{
				key: 'Asset2',
				type: 'STIssue'
			},
			{
				key: 'TradingFee',
				type: 'UInt16',
				optional: true
			}
		]
	},
	AMMWithdraw: {
		description: `withdraws assets from an Automated Market Maker (AMM) instance by returning the AMM's liquidity provider tokens (LP Tokens)`,
		fields: [
			{
				key: 'Asset',
				type: 'STIssue'
			},
			{
				key: 'Asset2',
				type: 'STIssue'
			},
			{
				key: 'Amount',
				type: 'Amount',
				optional: true
			},
			{
				key: 'Amount2',
				type: 'Amount',
				optional: true
			},
			{
				key: 'EPrice',
				type: 'Amount',
				optional: true
			},
			{
				key: 'LPTokenIn',
				type: 'Amount',
				optional: true
			},
		]
	},
	CheckCancel: {
		description: `cancels an unredeemed Check, removing it from the ledger without sending any money`,
		fields: [
			{
				key: 'CheckID',
				type: 'Hash256'
			}
		]
	},
	CheckCash: {
		description: `attempts to redeem a Check object in the ledger to receive up to the amount authorized by the corresponding CheckCreate transaction`,
		fields: [
			{
				key: 'CheckID',
				type: 'Hash256'
			},
			{
				key: 'Amount',
				type: 'Amount',
				optional: true
			},
			{
				key: 'DeliverMin',
				type: 'Amount',
				optional: true
			},
		]
	},
	CheckCreate: {
		description: `creates a Check object in the ledger, which is a deferred payment that can be cashed by its intended destination`,
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
				key: 'SendMax',
				type: 'Amount'
			},
			{
				key: 'Expiration',
				type: 'UInt32',
				optional: true
			},
			{
				key: 'InvoiceID',
				type: 'Hash256',
				optional: true
			}
		]
	},
	Clawback: {
		description: `claws back tokens issued by your account`,
		fields: [
			{
				key: 'Amount',
				type: 'Amount'
			}
		]
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
		description: `deletes the DID ledger entry associated with the specified Account field`,
		fields: []
	},
	DIDSet: {
		description: `creates a new DID ledger entry or updates the fields of an existing one`,
		fields: [
			{
				key: 'Data',
				type: 'Blob',
				optional: true
			},
			{
				key: 'DIDDocument',
				type: 'Blob',
				optional: true
			},
			{
				key: 'URI',
				type: 'Blob',
				optional: true
			},
		]
	},
	EscrowCancel: {
		description: `returns escrowed XRP to the sender`,
		fields: [
			{
				key: 'Owner',
				type: 'AccountID'
			},
			{
				key: 'OfferSequence',
				type: 'UInt32'
			},
		]
	},
	EscrowCreate: {
		description: `sequesters XRP until the escrow process either finishes or is canceled`,
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
				key: 'FinishAfter',
				type: 'UInt32',
				optional: true
			},
			{
				key: 'CancelAfter',
				type: 'UInt32',
				optional: true
			},
			{
				key: 'Condition',
				type: 'Blob',
				optional: true
			},
		]
	},
	EscrowFinish: {
		description: `delivers XRP from a held payment to the recipient`,
		fields: [
			{
				key: 'Owner',
				type: 'AccountID'
			},
			{
				key: 'OfferSequence',
				type: 'UInt32'
			},
			{
				key: 'Condition',
				type: 'Blob',
				optional: true
			},
			{
				key: 'Fulfillment',
				type: 'Blob',
				optional: true
			},
		]
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
			},
			{
				key: 'Expiration',
				type: 'UInt32',
				optional: true
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
		description: `sets aside one or more sequence numbers as Tickets`,
		fields: [
			{
				key: 'TicketCount',
				type: 'UInt32'
			}
		]
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