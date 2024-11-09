import readline from 'readline/promises'

const colorReset = '\x1b[0m'
const colorCyan = '\x1b[36m'
const colorRed = '\x1b[38;5;197m'

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: true
})

export async function ask({ message, validate, preset, redactAfter = false }){
	while(true){
		let input = await prompt({ message, preset })

		if(redactAfter && input.length > 0){
			process.stdout.moveCursor(0, -1)
			process.stdout.write(`${message}${cyan('*'.repeat(input.length))}\n`)
		}

		if(validate){
			let issue = await validate(input)

			if(typeof issue === 'string'){
				console.log(`${colorRed}${issue}${colorReset}`)
				preset = input
				continue
			}
		}

		return input
	}
}

export async function askConfirm({ message }){
	return await ask({
		message: `${message} (yes|no): `,
		validate: input => input.trim() !== 'yes' && input.trim() !== 'no'
			&& 'yes or no - try again'
	}) === 'yes'
}

export async function askChoice({ message, options }){
	let nr = 0
	let optionsList = Object.entries(options)
	
	console.log()

	for(let [_, label] of optionsList){
		console.log(`[${colorCyan}${++nr}${colorReset}] ${label}`)
	}

	console.log()

	while(true){
		let input = await prompt({
			message: `${colorReset}${message} (1-${optionsList.length}): ${colorCyan}`
		})

		if(input.length === 0){
			console.log(`enter number between 1 and ${optionsList.length}`)
			continue
		}

		let index = parseInt(input)

		if(!index || index < 1 || index > optionsList.length){
			console.log(`${colorRed}${input} is not a valid choice - try again${colorReset}`)
			continue
		}

		return optionsList[index - 1][0]
	}
}

export async function askPayload({ message, preset }){
	let input = preset

	while(true){
		input = await prompt({
			message,
			preset: input,
			multiline: input => {
				if(input.endsWith('\n'))
					return false

				if(input.trim().startsWith('{')){
					try{
						JSON.parse(input)
					}catch{
						return true
					}
				}
			}
		})

		input = input.trim()

		if(input.startsWith('{')){
			try{
				return { txJson: JSON.parse(input) }
			}catch(e){
				if(e instanceof SyntaxError)
					console.log(red(`input is not valid JSON - try again\n`))
				else
					throw e
			}
		}else if(/^[0-9A-F]$/.test(input.toUpperCase())){
			return { txBlob: input }
		}else{
			return { txMnemonic: input }
		}
	}
}

export async function askMnemonic({ message, type }){
	
}

export function cyan(text){
	return `${colorCyan}${text}${colorReset}`
}

export function red(text){
	return `${colorRed}${text}${colorReset}`
}

function prompt({ message, preset, multiline }){
	let resolve
	let reject
	let lines = []

	let lineHandler = line => {
		lines.push(line)

		let text = lines.join('\n')

		if(multiline && multiline(text)){
			rl.setPrompt('')
			return
		}

		rl.off('line', lineHandler)
		rl.off('SIGINT', abortHandler)
		rl.pause()
		process.stdout.write(colorReset)
		resolve(text)
	}

	let abortHandler = () => {
		rl.off('line', lineHandler)
		rl.off('SIGINT', abortHandler)
		rl.pause()
		process.stdout.write(colorReset)
		reject({ abort: true })
	}

	rl.on('line', lineHandler)
	rl.once('SIGINT', abortHandler)

	rl.resume()
	rl.setPrompt(`${colorReset}${message}${colorCyan}`)
	rl.prompt(false)

	if(preset)
		rl.write(preset)

	return new Promise(
		(res, rej) => {
			resolve = res
			reject = rej
		}
	)
}