import { z } from 'zod'
import { controller, get } from '@zhttp/core'

export const validationExampleController = controller('validationExample')

validationExampleController.endpoint(
  get('/hello', 'getGreeting')
    .input(z.object({
      query: z.object({
        // If a name shorter than 5 characcters is provided, then the server will responde with a ValidationError.
        name: z.string().min(5)
      })
    }))
    .response(z.object({
      message: z.string()
    }))
    .handler(async ({ query }) => {
      return {
        message: `Hello ${query.name ?? 'everyone'}!`
      }
    })
)

validationExampleController.endpoint(
  get('/goodbye', 'getGoodbye')
    .input(z.object({
      query: z.object({
        name: z.string().optional()
      })
    }))
    .response(z.object({
      message: z.string()
    }))
    .handler(async ({ query }) => {
      return {
        thisKeyShouldntBeHere: 'noBueno'
      } as any
      // ⬆ As zhttp is typesafe, you actually have to manually $x&! up the typing
      // to provoke an output validation error :)
      // This will result in an InternalServerError.
    })
)
