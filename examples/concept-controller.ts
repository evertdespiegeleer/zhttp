import { z } from 'zod'
import { controller, get } from '@zhttp/core'

export const greetingController = controller('greeting')
  .description('A controller that greets the world.')

greetingController.endpoint(
  get('/hello', 'getGreeting')
    .description('Say hello to everyone')
    .input({
      query: z.object({
        name: z.string().optional()
      })
    })
    .response(z.object({
      message: z.string()
    }))
    .handler(async ({ query }) => {
      return {
        message: `Hello ${query.name ?? 'everyone'}!`
      }
    })
)
