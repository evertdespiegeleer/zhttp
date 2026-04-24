import { apiResponse, controller, get, openapiController, Server, zApiOutput } from '@zhttp/core'
import { z } from 'zod'

// You can optionally add OAS info to a Zod schema using zodSchema.openapi(...).
// If this schema is used in the input or output of an endpoint, the info
// will be included in the generated openapi spec.

const zHelloResponse = zApiOutput(
  z.object({
    greeting: z.string().openapi({ example: 'Hello Joske!' })
  })
).openapi('HelloResponse')

const helloController = controller('Hello').description('This controller says hello to everyone')

helloController.endpoint(
  get('/hello')
    .input({
      params: z.object({
        name: z.string().optional()
      })
    })
    .response(zHelloResponse)
    .handler(async (input) => {
      return apiResponse({
        // Both the input object ⬇ and the handler response are strongly typed :)
        greeting: `Hello ${input.params.name ?? 'everybody'}!`
      })
    })
)

const server = new Server(
  {
    controllers: [helloController, openapiController],
    middlewares: []
  },
  {
    port: 3000,
    oasInfo: {
      title: 'A very cool api',
      version: '1.0.0'
    }
  }
)

server.start()
