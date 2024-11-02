import readline from 'readline/promises'

const colorReset = '\x1b[0m'
const colorCyan = '\x1b[36m'

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

rl.on('SIGINT', () => {
	rl.close()
	console.log(colorReset + 'ABORT')
	process.exit()
})

export async function ask({ message, validate }){
	while(true){
		let input = await rl.question(colorReset + message + colorCyan)

		process.stdout.write(colorReset)

		if(validate){
			let issue = await validate(input)

			if(typeof issue === 'string'){
				console.log(`${issue}`)
				continue
			}
		}

		return input
	}
}

export async function askChoice({ message, options }){
	let nr = 0
	let optionsList = Object.entries(options)
	
	console.log(message)

	for(let [_, label] of optionsList){
		console.log(`[${colorCyan}${++nr}${colorReset}] ${label}`)
	}

	console.log()

	while(true){
		let input = await rl.question(`${colorReset}your choice (1-${optionsList.length}): ${colorCyan}`)

		process.stdout.write(colorReset)

		if(input.length === 0){
			console.log(`enter number between 1 and ${optionsList.length}`)
			continue
		}

		let index = parseInt(input)

		if(!index || index < 1 || index > optionsList.length){
			console.log(`not a valid choice - try again`)
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
				console.log(`input is not valid JSON - try again\n`)
			else
				throw e
		}
	}
}

export async function askMnemonic({ message, type }){
	
}