import { endpoint, get } from '@zhttp/core'
import { z } from 'zod'

const zGreetingOutput = z.object({
  message: z.string()
})

const zGreetingInput = {
  query: z.object({
    name: z.string().optional()
  })
}

// ⬇ For common http methods (get, post, put, del), utility functions are available:
get('/hello', 'getGreeting')
  .description('Say hello to everyone')
  .input(zGreetingInput)
  .response(zGreetingOutput)
  .handler(async ({ query }) => {
    return {
      message: `Hello ${query.name ?? 'everyone'}!`
    }
  })

// `endpoint` is a generic function which supports every http method.
endpoint('get', '/goodbye', 'getGoodbye')
  .description('Say goodbye to everyone')
  .input(zGreetingInput)
  .response(zGreetingOutput)
  .handler(async ({ query }) => {
    return {
      message: `Goodbye ${query.name ?? 'everyone'}!`
    }
  })
