#!/usr/bin/env node

import minimist from 'minimist'
import { sign } from './wallet/sign.js'
import { submit } from './tx/submit.js'
import { askChoice, cyan, red } from './util/terminal.js'
import { createTx } from './tx/create.js'
import { createWallet, closeWallet, verifyWallet } from './wallet/manage.js'
import { lookupAccount, lookupNetworth, lookupObject } from './lookup/index.js'
import { useNode } from './util/net.js'

async function cli(args){
	if(args.terminal)
		process.stdout.write('\x1Bc')

	console.log(cyan(
` __  _____ ___ _    ___ _    ___ 
 \\ \\/ / _ \\ _ \\ |  / __| |  |_ _|
  >  <|   /  _/ |_| (__| |__ | | 
 /_/\\_\\_|_\\_| |____\\___|____|___|
 `))

	let exitCode = 0

	if(args.node){
		console.log(`using node ${args.node}`)
		useNode({ url: args.node })
	}
														 
	try{
		let action = args._[0]

		if(!action){
			try{
				action = await askChoice({
					message: 'choose action',
					options: {
						tx: 'create transaction',
						sign: 'sign transaction',
						submit: 'submit transaction',
						lookup: 'lookup ledger data',
						create: 'create wallet',
						verify: 'verify wallet',
						close: 'close wallet',
					}
				})
			}catch(error){
				if(error.abort){
					console.log(`\nEXIT\n`)
					process.exit(0)
				}else{
					throw error
				}
			}
		}

		switch(action){
			case 'tx': {
				await createTx({ type: args._[1] })
				break
			}

			case 'sign': {
				await sign({ tx: null })
				break
			}
		
			case 'submit': {
				await submit({ payload: null })
				break
			}

			case 'lookup': {
				let subaction = args._[1]

				if(!subaction){
					subaction = await askChoice({
						message: 'choose what to look up',
						options: {
							account: 'account info & objects',
							networth: 'account networth',
							object: 'ledger object by hash'
						}
					})
				}

				switch(subaction){
					case 'account': {
						await lookupAccount({ account: args._[2] })
						break
					}

					case 'networth': {
						await lookupNetworth({ account: args._[2], currency: args.currency })
						break
					}

					case 'object': {
						await lookupObject({ index: args._[2] })
						break
					}
				}

				break
			}

			case 'create': {
				await createWallet({ entropy: null })
				break
			}

			case 'verify': {
				await verifyWallet({ secret: null })
				break
			}

			case 'close': {
				await closeWallet({ address: null })
				break
			}
		
			default: {
				console.log(`command "${action}" is not known`)
				break
			}
		}
	}catch(error){
		if(error.abort){
			console.log(`\nABORT\n`)
		}else{
			console.error(red(error.message || error.error_message || error))
			exitCode = 1
		}
	}

	if(args.terminal)
		cli(args)
	else
		process.exit(exitCode)
}

await cli(minimist(process.argv.slice(2)))