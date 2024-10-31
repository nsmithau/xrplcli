import readline from 'readline/promises'

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
})

rl.on('SIGINT', () => {
	rl.close()
	console.log('ABORT')
	process.exit()
})

export async function ask({ message, validate }){
	while(true){
		let input = await rl.question(message)

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
		console.log(`[${++nr}] ${label}`)
	}

	console.log()

	while(true){
		let input = await rl.question(`your choice (1-${optionsList.length}): `)

		if(input.length === 0){
			console.log(`enter number between 1 and ${optionsList.length}`)
			continue
		}

		let index = parseInt(input)

		if(!index || index < 1 || index > optionsList.length){
			console.log(`not a valid choice`)
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
			rl.setPrompt(message)
			rl.prompt(true)

			return JSON.parse(
				await new Promise(res => resolve = res)
			)
		}catch(e){
			if(e instanceof SyntaxError)
				console.log(`input is not valid JSON\n`)
			else
				throw e
		}
	}
}