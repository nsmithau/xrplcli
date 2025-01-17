import { parentPort, workerData } from 'worker_threads'
import { generateSeed, deriveAddress } from '@xrplkit/wallet'

switch(workerData.task){
	case 'vanity': {
		let iters = 0
		let entropy = workerData.entropy
		let criteria = new RegExp(workerData.criteria)

		while(++iters){
			let seed = generateSeed({ entropy, algorithm: 'ed25519' })
			let address = deriveAddress({ seed })
			
			if(criteria.test(address)){
				parentPort.postMessage({
					type: 'found', 
					seed,
					address
				})
			}

			if(iters % 15 === 0)
				parentPort.postMessage({ type: 'progress', iters })
		}
	}
}