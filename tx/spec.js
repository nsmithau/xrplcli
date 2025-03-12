export const txCommonSpec = {
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

export const txSpec = {
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
	CredentialCreate: {
		description: `Creates a Credential object. It must be sent by the issuer.`,
		fields: [
			{
				key: 'CredentialType',
				type: 'Blob',
				description: 'A hex-encoded value to identify the type of credential from the issuer.'
			},
			{
				key: 'Subject',
				type: 'AccountID',
				description: 'The account that is the subject of the credential.'
			},
			{
				key: 'URI',
				type: 'Blob',
				optional: true,
				description: 'Additional data about the credential (such as a link to the VC document).'
			},
			{
				key: 'Expiration',
				type: 'UInt32',
				optional: true,
				description: 'Credential expiration.'
			}
		]
	},
	CredentialAccept: {
		description: `Accepts a credential, which makes the credential valid. Only the subject of the credential can do this.`,
		fields: [
			{
				key: 'Issuer',
				type: 'AccountID',
				description: 'The address of the issuer that created the credential.'
			},
			{
				key: 'CredentialType',
				type: 'Blob',
				description: 'Arbitrary data defining the type of credential. The minimum size is 1 byte and the maximum is 64 bytes.'
			}
		]
	},
	CredentialDelete: {
		description: `Deletes a credential from the ledger. Can be submitted by either the issuer or the subject of the credential.`,
		fields: [
			{
				key: 'CredentialType',
				type: 'Blob',
				description: 'The type of credential to delete.'
			},
			{
				key: 'Issuer',
				type: 'AccountID',
				description: 'The address of the issuer that created the credential.',
				optional: true
			},
			{
				key: 'Subject',
				type: 'AccountID',
				description: 'The address of the subject of the credential.',
				optional: true
			}
		]
	},
	DepositPreauth: {
		description: `gives another account or credential pre-approval to deliver payments to the sender of this transaction`,
		fields: [
			{
				key: 'Authorize',
				type: 'AccountID',
				optional: true,
				description: 'The XRP Ledger address of the sender to preauthorize.'
			},
			{
				key: 'Unauthorize',
				type: 'AccountID',
				optional: true,
				description: 'The XRP Ledger address of a sender whose preauthorization should be revoked.'
			},
			{
				key: 'AuthorizeCredentialType',
				type: 'Blob',
				optional: true,
				description: 'The type of credential to preauthorize (hex-encoded).'
			},
			{
				key: 'AuthorizeCredentialIssuer',
				type: 'AccountID',
				optional: true,
				description: 'The issuer of the credential to preauthorize.'
			},
			{
				key: 'UnauthorizeCredentialType',
				type: 'Blob',
				optional: true,
				description: 'The type of credential to unauthorize (hex-encoded).'
			},
			{
				key: 'UnauthorizeCredentialIssuer',
				type: 'AccountID',
				optional: true,
				description: 'The issuer of the credential to unauthorize.'
			}
		],
		preprocessor: (tx) => {
			console.log('Processing DepositPreauth transaction:', JSON.stringify(tx, null, 2))
			
			// Handle credential authorization
			if (tx.AuthorizeCredentialType && tx.AuthorizeCredentialIssuer) {
				console.log('Adding AuthorizeCredentials')
				tx.AuthorizeCredentials = [{
					Credential: {
						CredentialType: tx.AuthorizeCredentialType,
						Issuer: tx.AuthorizeCredentialIssuer
					}
				}]
				delete tx.AuthorizeCredentialType
				delete tx.AuthorizeCredentialIssuer
			}
			
			// Handle credential unauthorized
			if (tx.UnauthorizeCredentialType && tx.UnauthorizeCredentialIssuer) {
				console.log('Adding UnauthorizeCredentials')
				tx.UnauthorizeCredentials = [{
					Credential: {
						CredentialType: tx.UnauthorizeCredentialType,
						Issuer: tx.UnauthorizeCredentialIssuer
					}
				}]
				delete tx.UnauthorizeCredentialType
				delete tx.UnauthorizeCredentialIssuer
			}
			
			console.log('Processed transaction:', JSON.stringify(tx, null, 2))
			return tx
		}
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
		description: `claims XRP from a payment channel, adjusts the payment channel's expiration, or both`,
		fields: [
			{
				key: 'Channel',
				type: 'Hash256'
			},
			{
				key: 'Balance',
				type: 'Amount',
				optional: true
			},
			{
				key: 'Amount',
				type: 'Amount',
				optional: true
			},
			{
				key: 'Signature',
				type: 'Blob',
				optional: true
			},
			{
				key: 'PublicKey',
				type: 'Blob',
				optional: true
			},
		],
		flags: [
			{
				name: 'tfRenew',
				value: 0x00010000
			},
			{
				name: 'tfClose',
				value: 0x00020000
			},
		]
	},
	PaymentChannelCreate: {
		description: `creates a payment channel and funds it with XRP`,
		fields: [
			{
				key: 'Amount',
				type: 'Amount'
			},
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
				key: 'SettleDelay',
				type: 'UInt32'
			},
			{
				key: 'PublicKey',
				type: 'Blob'
			},
			{
				key: 'CancelAfter',
				type: 'UInt32',
				optional: true
			},
		]
	},
	PaymentChannelFund: {
		description: `adds additional XRP to an open payment channel, and optionally updates the expiration time of the channel`,
		fields: [
			{
				key: 'Channel',
				type: 'Hash256'
			},
			{
				key: 'Amount',
				type: 'Amount',
				optional: true
			},
			{
				key: 'Expiration',
				type: 'UInt32',
				optional: true
			},
		],
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