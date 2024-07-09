import minimist from 'minimist'
import { sign } from './tx.js'
import { submit } from './submit.js'
import { askChoice } from './terminal.js'

async function cli(args){
	try{
		switch(args._[0]){
			case 'sign': {
				await sign({ tx: null })
				break
			}
		
			case 'submit': {
				await submit({ payload: null })
				break
			}
		
			default: {
				let choice = await askChoice({
					message: 'choose action',
					choices: {
						tx: 'make transaction',
						sign: 'sign transaction or payload',
						submit: 'submit transaction'
					}
				})

				await cli({
					_: [choice]
				})
			}
		}
	}catch(error){
		if(error === ''){
			console.log('aborted')
			process.exit(1)
		}
		console.error(error)
	}
}

await cli(minimist(process.argv.slice(2)))