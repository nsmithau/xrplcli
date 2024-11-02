import { askChoice } from './terminal.js'

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
	Payment: {},
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
}