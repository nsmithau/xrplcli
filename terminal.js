import enquirer from 'enquirer'

export async function ask({ message, multiline, validate }){
	let prompt = new enquirer.Input({
		message,
		multiline,
		validate
	})

	prompt.styles.primary = prompt.styles.white
	prompt.styles.submitted = prompt.styles.disabled
	prompt.styles.danger = prompt.styles.warning
	prompt.prefix = () => ''
	prompt.separator = () => ''
	prompt.message = () => message

	return await prompt.run()
}

export async function askPayload({ message }){
	let input = await ask({
		message,
		multiline: true,
		validate: input => {
			if(/^[0-9A-F]+\n*$/.test(input))
				return true
			try{
				return !!JSON.parse(input) || true
			}catch{
				return 'input is neither valid JSON nor HEX - please correct'
			}
		}
	})

	process.stdout.write(`\x1B[F`)

	return /^[A-Z0-9]+\n*$/.test(input) 
		? input 
		: JSON.parse(input)
}

export async function askJSON({ message }){
	let json = await ask({
		message,
		multiline: true,
		validate: input => {
			try{
				return !!JSON.parse(input) || true
			}catch{
				return 'input is invalid JSON - please correct'
			}
		}
	})

	process.stdout.write(`\x1B[F`)

	return JSON.parse(json)
}

export async function askChoice({ message, choices }){
	let prompt = new enquirer.Select({
		message,
		choices: Object.values(choices),
		promptLine: false
	})

	prompt.styles.em = prompt.styles.white
	prompt.styles.primary = prompt.styles.white

	console.log(message)

	let choice = await prompt.run()

	return Object.entries(choices)
		.find(([key, label]) => label === choice)
		[0]
}