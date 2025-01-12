import { div, gt, lte, sum } from '@xrplkit/xfl'
import { currencyHexToUTF8, formatValue } from '@xrplkit/tokens'
import { isValidClassicAddress } from 'ripple-address-codec'
import { ask, askChoice, presentTask } from './terminal.js'
import { connect } from './net.js'
import { isSameToken } from '@xrplkit/tokens'
import { getBookSignature, loadBook } from '@xrplkit/book'
import { simulateOffer } from '@xrplkit/simulate'

const baseCurrencies = {
	USD: [
		{
			currency: 'RLUSD',
			issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
		},
		{
			currency: 'USD',
			issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B'
		},
		{
			currency: 'USD',
			issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
		},
		{
			currency: 'USDC',
			issuer: 'rcEGREd8NmkKRE8GE424sksyt1tJVFZwu'
		},
		{
			currency: 'USD',
			issuer: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'
		}
	],
	EUR: [
		{
			currency: 'EUR',
			issuer: 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
		}
	],
	CNY: [
		{
			currency: 'CNY',
			issuer: 'rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y'
		}
	]
}

export async function readNetworth({ account, currency }){
	let parse = account => {
		let accounts = account
			.split(',')
			.map(account => account.trim())

		for(let account of accounts){
			if(!isValidClassicAddress(account))
				throw `"${account}" is not a valid r-address`
		}

		return accounts
	}

	if(!account){
		account = await ask({
			message: `account address:`,
			hint: `can be multiple, separated by comma`,
			required: true,
			validate: input => {
				try{ parse(input) } catch(e) {
					return e
				}
				return true
			}
		})
	}

	if(!currency){
		currency = await askChoice({
			message: `calculate networth in currency`,
			options: {
				XRP: 'XRP',
				...Object.keys(baseCurrencies).reduce((a, c) => ({ ...a, [c]: c}), {})
			}
		})
	}

	let accounts = parse(account)
	let positions = []
	let books = {}
	
	for(let address of accounts){
		await presentTask({
			message: `calculating networth for ${address}`,
			execute: async ({ indicator }) => {
				let socket = await connect()

				let { account_data } = await socket.request({
					command: 'account_info',
					account: address
				})

				positions.push({
					address,
					currency: 'XRP',
					balance: div(account_data.Balance, '1000000')
				})

				let { lines } = await socket.request({
					command: 'account_lines',
					account: address
				})

				positions.push(
					...lines
						.filter(line => gt(line.balance, '0'))
						.map(line => ({
							address,
							currency: line.currency,
							issuer: line.account,
							balance: line.balance
						}))
				)

				let accountPositions = positions.filter(position => position.address === address)

				for(let position of accountPositions){
					indicator.text = `calculating networth for ${address} (${accountPositions.indexOf(position) + 1} of ${accountPositions.length})`
					
					if(currency === 'XRP' && position.currency === 'XRP'){
						position.value = position.balance
					}else if(baseCurrencies[currency].some(token => isSameToken(token, position))){
						position.value = position.balance
					}else{
						let valueXRP

						if(position.currency !== 'XRP'){
							let book = {
								takerPays: {
									currency: position.currency,
									issuer: position.issuer
								},
								takerGets: {
									currency: 'XRP'
								}
							}
							
							book = books[getBookSignature(book)] || await loadBook({ ...book, socket })

							let { takerPaid } = await simulateOffer({
								takerGets: {
									currency: position.currency,
									issuer: position.issuer,
									value: position.balance
								},
								book
							})

							valueXRP = takerPaid.value
						}else{
							valueXRP = position.balance
						}

						if(lte(valueXRP, '0')){
							position.value = 0
						}else if(currency !== 'XRP'){
							let book = {
								takerGets: baseCurrencies[currency][0],
								takerPays: {
									currency: 'XRP'
								}
							}
							
							book = books[getBookSignature(book)] || await loadBook({ ...book, socket })
	
							let { takerPaid } = await simulateOffer({
								takerGets: {
									currency: 'XRP',
									value: valueXRP
								},
								book
							})

							position.value = takerPaid.value
						}else{
							position.value = valueXRP
						}
					}
				}
			}
		})
	}

	let printPosition = position => {
		let formattedBalance = `${currencyHexToUTF8(position.currency)} (${formatValue(position.balance, { compact: true })})`
		let formattedValue = parseFloat(position.value.toString()).toLocaleString('en', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})

		console.log(`- ${formattedBalance.padEnd(16).slice(0, 16)} ${formattedValue.padStart(10)} ${currency}`)
	}

	let printTotal = total => {
		let formattedTotal = parseFloat(total.toString()).toLocaleString('en', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})

		console.log(`---------------------------------`)
		console.log(`total ${formattedTotal.padStart(23)} ${currency}`)
	}

	for(let address of accounts){
		let total = '0'

		console.log(``)
		console.log(address)

		for(let position of positions){
			if(position.address !== address)
				continue

			printPosition(position)

			total = sum(total, position.value)
		}

		printTotal(total)
	}

	if(accounts.length > 1){
		console.log(``)
		console.log(`IN SUMMARY`)

		let summary = {}

		for(let position of positions){
			let key = `${position.currency}:${position.issuer}`

			summary[key] = [
				...(summary[key] || []),
				position
			]
		}
		
		for(let group of Object.values(summary)){
			let totalBalance = group.reduce((s, p) => sum(s, p.balance), '0')
			let totalValue = group.reduce((s, p) => sum(s, p.value), '0')

			printPosition({
				...group[0],
				balance: totalBalance,
				value: totalValue
			})
		}

		printTotal(
			positions.reduce((s, p) => sum(s, p.value), '0')
		)
	}
}