![zhttp, a minimal, typesafe HTTP library with Zod validation](./.readme-assets/header.png)

`zhttp`  is a minimal, typesafe, [OpenAPI](https://www.openapis.org/) compatible HTTP library. It's build around [express](https://github.com/expressjs/express) and [Zod](https://github.com/colinhacks/zod).

It solves some of the major pains of building an API with express (handler typing, error handling, input/output validation, openapi...) while attempting to stay as flexible (read: _as close to plain express_) as possible.

[🧪 Try out zhttp on Stackblitz!](https://stackblitz.com/~/github.com/evertdespiegeleer/zhttp-example-app?initialPath=%2Fapi.html)

# Installation

```sh
npm install @zhttp/core @zhttp/errors zod
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

const server = new Server({
  controllers: [
    helloController,
    openapiController
  ],
  middlewares: []
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

## Endpoints

Endpoints are the building blocks of your API. They define the HTTP methods, paths, inputs, outputs, and behavior for each API call.
As can be seen in the example below, endpoints are defined using a function chaining approach.
These functions are further refered to as 'modulators'.

### Handlers and input/output typing

Endpoint handlers are similar to plain express handlers, with some extra feastures for strict input and output typing. Rather than the typical 2 express handler parameters (`request` and `response`), there's three: `inputs`, `request`, `response`.
`inputs` is a typed object containing everything defined in the input schema. `request` and `response` are simply the express `request` and `response` objects.

Sending out a response is as simle as returning a value in the handler function. Handler responses, just like inputs, are strictly typed. When an output schema is specified and the handler function doesn't return a value that corresponds to said schema, typescript will comlain.

By default, every endpoint will send its response with a `application/json` content type. This is typial for APIs, but there might be exceptions. You can override this content type using the `responseContentType` modulator.

#### Using req/res directly

You _can_ take input via the `request` object and use the `response` object to send a response in typical express manner, so migrating from express should be fairly trivial.
However, beware that where you do this, you'll lose:
- strict typing
- output validation
- AFTER-type middlewares

### Routing
An important distinction between plain express and zhttp is that zhttp – consciously – doesn't really support routing. The paths you see in your endpoint definitions are the paths that can be called; No hidden prefixes.

### Basic endpoint example

```ts
// ./examples/concept-endpoint.ts

import { z } from 'zod'
import { endpoint, get } from '@zhttp/core'

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

```

## Middleware

A middleware is a function that operates between an incoming request and the corresponding outgoing response. It serves as a processing layer before or after an endpoint handler, carrying out tasks like logging, authentication, and other sorts of data manipulation.

Middlewares in `zhttp` are essentially just express middlewares, with two extra properties: their type ([indicating when to run them](#order-of-execution)), and an optional name.
Middlewares can be bound on multiple levels:
- The server
- A controller
- An endpoint

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

## Server

### Basic server example

```ts
// ./examples/concept-server.ts

import { Server } from '@zhttp/core'
import { greetingController } from './concept-controller.js'
import { lastVisitMiddleware } from './concept-middleware.js'

export const server = new Server({
  controllers: [greetingController],
  middlewares: [lastVisitMiddleware]
}, {
  port: 8080
})

// eslint-disable-next-line @typescript-eslint/no-floating-promises
server.start()

```

# OpenAPI

## `openapiController`

The package exports a special controller `openapiController`. When used, this controller exposes routes `/openapi.json` (the OpenAPI json spec) and `/api.html` (a [RapiDoc](https://rapidocweb.com/) api interface).

## Programmatic access

The openapi definition can be directly from the server object.

```ts
// ./examples/direct-openapi.ts

import { server } from './concept-server.js'

console.log(
  server.oasInstance.getJsonSpec()
)

```

# Errors

`zhttp` has a [built in error handler](./packages/core/src/middleware/errorHandler.ts), which will catch any sort of error thrown in an endpoint or middleware.

## `@zhttp/errors`

Any type of unknown error will be logged and will result in a `InternalServerError` response (http status code 500).

If you want to throw a specific type of error which will be reflectced in the http response, you can use the `@zhttp/errors` library.

```ts
// ./examples/concepts-errors.ts

import { z } from 'zod'
import { controller, get } from '@zhttp/core'
import { NotFoundError } from '@zhttp/errors'

// Let's presume we're talking to some sort of database
const db: any = undefined

export const vegetablesController = controller('vegetables')

vegetablesController.endpoint(
  get('/vegetables/:vegetableId', 'getVegetableDetails')
    .input({
      params: z.object({
        vegetableId: z.string().uuid()
      })
    })
    .response(z.object({
      message: z.string()
    }))
    .handler(async ({ params: { vegetableId } }) => {
      const vegetableDetails = await db.getVegetableById(vegetableId)
      if (vegetableDetails == null) {
        // ✨✨✨✨✨✨✨✨✨
        throw new NotFoundError(`Vegetable with id ${vegetableId} does not exist`)
        // ⬆ This will result in a 404 response
        // ✨✨✨✨✨✨✨✨✨
      }
      return vegetableDetails
    })
)

```

## Validation errors

If an error is detected as part of the request input validation, the server will send a `ValidationError` response, including an error message explaining what's wrong.

If an error is detected as part of the request output validation, an `InternalServerError` is returned, and error message is logged.

```ts
// ./examples/validation-errors.ts

import { z } from 'zod'
import { controller, get } from '@zhttp/core'

export const validationExampleController = controller('validationExample')

validationExampleController.endpoint(
  get('/hello', 'getGreeting')
    .input({
      query: z.object({
        // If a name shorter than 5 characcters is provided, then the server will responde with a ValidationError.
        name: z.string().min(5)
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

validationExampleController.endpoint(
  get('/goodbye', 'getGoodbye')
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
        thisKeyShouldntBeHere: 'noBueno'
      } as any
      // ⬆ As zhttp is typesafe, you actually have to manually $x&! up the typing
      // to provoke an output validation error :)
      // This will result in an InternalServerError.
    })
)

```

# Order of execution
- Server 'BEFORE' middlewares
- Controller 'BEFORE' middlewares
- Endpoint 'BEFORE' middlewares
- **Endpoint handler**
- Endpoint 'AFTER' middlewares
- Controller 'AFTER' middlewares
- Server 'AFTER' middlewares

# CommonJS support

[📰 CommonJS is hurting JavaScript](https://deno.com/blog/commonjs-is-hurting-javascript)

The JavaScript ecosystem is (slowly but steadily) moving towards ESM and away from CommonJS. zhttp is build as an ESM module. It's strongly encouraged to use it like that.

CommonJS is currently supported; the packages include both builds for ESM and CommonJS. You can use zhttp both ways.

If major issues with supporting CommonJS were to come up, or if we'd notice that the package would become too big (by essentially having to ship the build code twice), CommonJS support might be dropped in the future.