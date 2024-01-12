![zhttp, a minimal, typesafe HTTP library with Zod validation](./.readme-assets/header.png)

# Installation

```sh
npm install @zhttp/core @zhttp/errors
```

# Basic usage examples

```ts
// ./examples/basic-usage.ts

import { z } from 'zod'
import {
  Server,
  controller,
  get,
  extendZodWithOpenApi,
  zApiOutput,
  apiResponse,
  openapiController
} from '@zhttp/core'

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
    helloController,
    openapiController
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

```

# Concepts

## Middleware

### Basic middleware example

```ts
// ./examples/concept-middleware.ts

import { type Request, type Response, type NextFunction } from 'express'
import { middleware, MiddlewareTypes } from '@zhttp/core'

export const lastVisitMiddleware = middleware({
  name: 'lastVisitMiddleware',
  type: MiddlewareTypes.BEFORE,
  handler (req: Request, res: Response, next: NextFunction) {
    const now = new Date()
    const lastVisitCookieValue = req.cookies.beenHereBefore
    const lastVisitTime = lastVisitCookieValue != null ? new Date(String(lastVisitCookieValue)) : undefined
    res.cookie('beenHereBefore', now.toISOString())
    if (lastVisitTime == null) {
      console.log('Seems like we\'ve got a new user 👀')
      next(); return
    }
    const daysSinceLastVisit = (now.getTime() - lastVisitTime.getTime()) / (1000 * 60 * 60 * 24)
    console.log(`It's been ${daysSinceLastVisit} days since this user last visited.`)
    next()
  }
})

```

## Endpoints

### Basic endpoint example

```ts
// ./examples/concept-endpoint.ts

import { z } from 'zod'
import { endpoint, get } from '@zhttp/core'

const zGreetingOutput = z.object({
  message: z.string()
})

const zGreetingInput = z.object({
  query: z.object({
    name: z.string().optional()
  })
})

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

```

## Controllers

An controller, essentially, is nothing but a group of endpoints.
Just like individual endpoints, controllers can be assigned middlewares.
Controllers do **not** serve as routers. Every endpoint path should be a _complete_ path.

### Basic controller example

```ts
// ./examples/concept-controller.ts

import { z } from 'zod'
import { controller, get } from '@zhttp/core'

export const greetingController = controller('greeting')
  .description('A controller that greets the world.')

greetingController.endpoint(
  get('/hello', 'getGreeting')
    .description('Say hello to everyone')
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
        message: `Hello ${query.name ?? 'everyone'}!`
      }
    })
)

```

## Server

### Basic server example

```ts
// ./examples/concept-server.ts

import { Server } from '@zhttp/core'
import { greetingController } from './concept-controller.js'
import { lastVisitMiddleware } from './concept-middleware.js'

const server = new Server({
  controllers: [greetingController],
  middlewares: [lastVisitMiddleware]
}, {
  port: 8080
})

// eslint-disable-next-line @typescript-eslint/no-floating-promises
server.start()

```

# OpenAPI

The package exports a special controller `openapiController`. When used, this controller exposes routes `/openapi.json` (the OpenAPI json spec) and `/api.html` (a [RapiDoc](https://rapidocweb.com/) api interface).

# Errors

# Order of execution
- Server 'BEFORE' middlewares
- Controller 'BEFORE' middlewares
- Endpoint 'BEFORE' middlewares
- **Endpoint handler**
- Endpoint 'AFTER' middlewares
- Controller 'AFTER' middlewares
- Server 'AFTER' middlewares