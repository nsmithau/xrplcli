import readline from 'readline/promises'

const colorReset = '\x1b[0m'
const colorCyan = '\x1b[36m'
const colorRed = '\x1b[38;5;197m'

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

export async function ask({ message, validate, preset }){
	while(true){
		let input = await prompt(message, preset)

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

export async function askChoice({ message, options }){
	let nr = 0
	let optionsList = Object.entries(options)
	
	console.log()

	for(let [_, label] of optionsList){
		console.log(`[${colorCyan}${++nr}${colorReset}] ${label}`)
	}

	console.log()

	while(true){
		let input = await prompt(`${colorReset}${message} (1-${optionsList.length}): ${colorCyan}`)

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

export async function askJSON({ message }){
	while(true){
		try{
			let resolve
			let lines = []
			let lineHandler = line => {
				lines.push(line)

				let text = lines.join('\n').trim()
				let complete = true

				try{
					JSON.parse(text)
				}catch{
					complete = false
				}

				if(complete || line.length === 0){
					rl.off('line', lineHandler)
					resolve(text)
				}
			}

			rl.on('line', lineHandler)
			rl.setPrompt(`${colorReset}${message}${colorCyan}`)
			rl.prompt(true)

			return JSON.parse(
				await new Promise(res => resolve = res)
					.then(result => (process.stdout.write(colorReset), result))
			)
		}catch(e){
			if(e instanceof SyntaxError)
				console.log(`${colorRed}input is not valid JSON - try again${colorReset}\n`)
			else
				throw e
		}
	}
}

export async function askMnemonic({ message, type }){
	
}

export function cyan(text){
	return `${colorCyan}${text}${colorReset}`
}

function prompt(message, preset){
	return new Promise(
		(resolve, reject) => {
			let abortController = new AbortController()
			let handleAbort = () => {
				abortController.abort()
				process.stdout.write(colorReset)
				reject({ abort: true })
			}

			rl.question(
				`${colorReset}${message}${colorCyan}`, 
				{ signal: abortController.signal }
			).catch(() => 0).then(input => {
				process.stdout.write(colorReset)
				rl.off('SIGINT', handleAbort)
				resolve(input)
			})

			if(preset)
				rl.write(preset)

			rl.once('SIGINT', handleAbort)
		}
	)
}