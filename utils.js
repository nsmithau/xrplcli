import { amountToRippled } from '@xrplkit/tokens'
import { isValidClassicAddress } from 'ripple-address-codec'

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

		if(currency !== 'XRP'){
			if(!issuer)
				throw new SyntaxError(`token amounts must be specified as [VALUE] [CURRENCY]:[ISSUER]`)
			if(!isValidClassicAddress(issuer))
				throw new SyntaxError(`malformed token issuing address`)
		}

		return amountToRippled({
			currency,
			issuer,
			value
		})
	}
}