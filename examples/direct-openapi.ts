import { server } from './concept-server.js'

console.log(
  server.oasInstance.getJsonSpec()
)
