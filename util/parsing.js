import { amountToRippled } from '@xrplkit/tokens'
import { isValidClassicAddress } from 'xrpl'

export function parseAmount(str){
	let [value, token] = str.trim().split(' ')

	if(value.length === 0){
		throw new SyntaxError(`empty value cannot be an amount`)
	}else if(!token){
		if(/^[d]+$/.test(value))
			throw new SyntaxError(`drop amount must be positive integer`)

		return value
	}else{
		return amountToRippled({
			...parseToken(token),
			value
		})
	}
}

export function parseToken(str){
	let [currency, issuer] = str.split(':')

	if(currency !== 'XRP'){
		if(!issuer)
			throw new SyntaxError(`iou must be specified as [CURRENCY]:[ISSUER]`)
		if(!isValidClassicAddress(issuer))
			throw new SyntaxError(`malformed token issuing address`)
	}

	return { currency, issuer }
}