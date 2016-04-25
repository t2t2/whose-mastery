// Ensure config is loaded first to make sure debug gets configured
import './config'

import makeServer from './server'

makeServer().then(app => {
	global.app = app
}).catch(e => {
	console.error(e.stack)
	process.exit(1)
})
