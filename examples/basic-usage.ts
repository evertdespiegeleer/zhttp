import { z } from 'zod'
import {
  Server,
  controller,
  get,
  extendZodWithOpenApi,
  zApiOutput,
  apiResponse
} from '../src/main.js'

extendZodWithOpenApi(z)
// ⬆ What this allows you to do is to optionally add OAS info
// to a Zod validation schema using zodSchema.openapi(...)
// If this Zod schema is used in the input or output of an endpoint,
// the info provided will be included in the generated openapi spec.
//
// Exmaple:

const zHelloResponse = zApiOutput(z.object({
  greeting: z.string().openapi({ example: 'Hello Joske!' })
})).openapi('HelloResponse')

const helloController = controller('Hello')
  .description('This controller says hello to everyone')

helloController.endpoint(
  get('/hello')
    .input(z.object({
      params: z.object({
        name: z.string().optional()
      })
    }))
    .response(zHelloResponse)
    .handler(async (input) => {
      return apiResponse({
        // Both the input object ⬇ and the handler response are strongly typed :)
        greeting: `Hello ${input.params.name ?? 'everybody'}!`
      })
    })
)

const server = new Server({
  controllers: [
    helloController
  ]
}, {
  port: 3000,
  oasInfo: {
    title: 'A very cool api',
    version: '1.0.0'
  }
})

// eslint-disable-next-line @typescript-eslint/no-floating-promises
server.start()
