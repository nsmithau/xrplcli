import readline from 'readline/promises'
import Enquirer from 'enquirer'
import ora from 'ora'

const { Input, Select, Confirm, Form, MultiSelect } = Enquirer

const colorReset = '\x1b[0m'
const colorCyan = '\x1b[36m'
const colorGreen = '\x1b[32m'
const colorRed = '\x1b[38;5;197m'

export async function ask({ 
	message, 
	validate, 
	parse, 
	preset, 
	hint, 
	note, 
	multiline = false,
	required = false, 
	redactAfter = false
}){
	if(parse){
		let ogValidate = (validate || (() => true))

		validate = input => {
			try{ parse(input) } catch (error) {
				return error.message || error
			}
			return ogValidate(input)
		}
	}

	let prompt = new Input({
		message: typeof message === 'string'
			? message
			: prompt => message(prompt.input),
		hint,
		initial: preset,
		multiline,
		required,
		validate: required
			? input => input.trim().length === 0
				? 'required'
				: (validate ? validate(input) : true)
			: validate,
		result: parse,
		footer: note
			? prompt => note(prompt.input)
			: undefined
	})

	try{
		var input = await prompt.run()
	}catch(error){
		if(error === '')
			throw { abort: true }
		else
			throw error
	}

	if(redactAfter && input.length > 0){
		let messageLength = typeof message === 'string'
			? message.length
			: message(input).length

		process.stdout.moveCursor(messageLength + 5, -1)
		process.stdout.write(`${cyan('*'.repeat(input.length))}\n`)
	}

	return input
}

export async function askConfirm({ message }){
	let prompt = new Confirm({
		message
	})

	try{
		return await prompt.run()
	}catch(error){
		if(error === '')
			throw { abort: true }
		else
			throw error
	}
}

export async function askChoice({ message, options }){
	let optionsKeys = Object.keys(options)
	let optionsValues = Object.values(options)

	let prompt = new Select({
		message,
		choices: optionsValues.slice()
	})
	
	try{
		let choice = await prompt.run()
		return optionsKeys[optionsValues.indexOf(choice)]
	}catch(error){
		if(error === '')
			throw { abort: true }
		else
			throw error
	}
}

export async function askForm({ message, fields }){
	let prompt = new Form({
		message,
		footer: '\npress ENTER to submit',
		choices: fields,
		validate: input => {
			let issues = fields
				.map(({ name, validate }) => ({ name, issue: validate(input[name]) }))
				.filter(({ issue }) => typeof issue === 'string')
				.map(({ name, issue }) => `${name}: ${issue}`)
			
			if(issues.length === 0)
				return true
			else
				return issues.join(', ')
		}
	})

	try{
		return await prompt.run()
	}catch(error){
		if(error === '')
			throw { abort: true }
		else
			throw error
	}
}

export async function askSelection({ message, fields }){
	let prompt = new MultiSelect({
		message,
		footer: '\npress ENTER to submit',
		choices: fields
	})

	try{
		return await prompt.run()
	}catch(error){
		if(error === '')
			throw { abort: true }
		else
			throw error
	}
}

export async function askTx({ message, hint, parse }){
	while(true){
		let parse = input => {
			input = input.trim()

			if(input.startsWith('{')){
				try{
					return { tx: JSON.parse(input) }
				}catch{
					throw `not valid JSON`
				}
			}else if(/^[0-9A-F]+$/.test(input.toUpperCase())){
				return { txBlob: input }
			}else{
				return { txMnemonic: input }
			}
		}

		let prompt = new Input({
			message,
			hint,
			multiline: true,
			initial: preset,
			validate: input => {
				if(input.length === 0)
					return 'required'
				
				try{
					parse(input)
					return true
				}catch(error){
					return error
				}
			}
		})

		try{
			input = await prompt.run()
		}catch(error){
			if(error === '')
				throw { abort: true }
			else
				throw error
		}

		return parse(input)
	}
}

export async function awaitInterrupt(){
	await new Promise(resolve => {
		let rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: true
		})

		rl.once('SIGINT', () => rl.close() + resolve())
	})
}

export async function presentTask({ message, execute, retryable = true }){
	while(true){
		let indicator = ora({ text: message }).start()

		try{
			await execute({ indicator })
			indicator.stopAndPersist({
				text: message,
				symbol: green('√')
			}) 
			break
		}catch(error){
			indicator.stopAndPersist({
				text: error.message || error.error_message || error,
				symbol: red('x')
			})

			if(retryable){
				if(await askConfirm({ message: 'retry?' }))
					continue
			}

			throw error
		}
	}
}

export function cyan(text){
	return `${colorCyan}${text}${colorReset}`
}

export function green(text){
	return `${colorGreen}${text}${colorReset}`
}

export function red(text){
	return `${colorRed}${text}${colorReset}`
}