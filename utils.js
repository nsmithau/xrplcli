import { amountToRippled } from '@xrplkit/tokens'

export function parseAmount(str){
	let [value, token] = str.trim().split(' ')

	if(value.length === 0){
		throw new SyntaxError(`empty value cannot be an amount`)
	}else if(!token){
		if(/^[d]+$/.test(value))
			throw new SyntaxError(`drop amount must be positive integer`)

		return value
	}else{
		let [currency, issuer] = token.split(':')

		return amountToRippled({
			currency,
			issuer,
			value
		})
	}
}