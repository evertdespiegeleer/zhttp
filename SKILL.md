---
name: zhttp
description: "How to build type-safe HTTP APIs using the @zhttp/core and @zhttp/errors libraries (Express + Zod). Use this skill whenever writing API endpoints, controllers, middleware, error handling, or OpenAPI specs with zhttp — even if the user just says 'add an endpoint' or 'create an API route' in a project that depends on @zhttp/core."
---

# zhttp

A minimal, type-safe, OpenAPI-compatible HTTP library built on Express and Zod. It adds handler typing, input/output validation, error handling, and automatic OpenAPI spec generation to Express — without heavy abstractions.

## Installation

```bash
npm install @zhttp/core @zhttp/errors zod
```

Requires Node 20.10+, TypeScript 5.5+, and `"strict": true` in tsconfig.json.

## Core concepts

zhttp has four building blocks: **endpoints**, **controllers**, **middleware**, and a **server**. Endpoints define routes with validated inputs/outputs. Controllers group endpoints. Middleware runs before or after handlers. The server wires it all together.

## Endpoints

Endpoints are built with a fluent builder pattern. Use the shorthand helpers `get`, `post`, `put`, `del` for common methods, or `endpoint(method, path, name?)` for any HTTP method.

```ts
import { z } from 'zod'
import { get, post, endpoint } from '@zhttp/core'

get('/users/:userId', 'getUser')
  .description('Retrieve a user by ID')
  .input({
    params: z.object({ userId: z.string().uuid() }),
    query: z.object({ includeDetails: z.boolean().optional() })
  })
  .response(z.object({
    id: z.string(),
    name: z.string()
  }))
  .handler(async ({ params, query }) => {
    // `params` and `query` are fully typed and validated
    const user = await db.getUserById(params.userId)
    if (user == null) throw new NotFoundError('User not found')
    return { id: user.id, name: user.name }
  })
```

### Input schema

The `.input()` modulator accepts an object with optional keys:
- `params` — ZodObject for URL path parameters
- `query` — ZodObject for query string parameters
- `body` — any Zod schema for the request body

Invalid input automatically returns a 400 `ValidationError` with details.

### Handler signature

```ts
.handler(async (inputs, req, res) => { ... })
```

- `inputs` — validated, typed object with `params`, `query`, `body`
- `req`, `res` — standard Express objects (use sparingly — bypassing `inputs`/return loses type safety and output validation)
- Return a value to send the response. The return type is checked against `.response()`.

### Response content type

Defaults to `application/json`. Override with:

```ts
.responseContentType('text/csv')
```

### Endpoint-level middleware

```ts
.middleware(authMiddleware)
.middlewares([rateLimiter, logger])
```

## Controllers

Controllers group related endpoints. They do **not** add path prefixes — every endpoint path must be complete.

```ts
import { controller, get, post } from '@zhttp/core'

const usersController = controller('users')
  .description('User management')
  .middleware(authMiddleware) // applies to all endpoints in this controller

usersController.endpoint(
  get('/users', 'listUsers')
    .response(z.object({ users: z.array(userSchema) }))
    .handler(async () => ({ users: await db.listUsers() }))
)

usersController.endpoint(
  post('/users', 'createUser')
    .input({ body: createUserSchema })
    .response(userSchema)
    .handler(async ({ body }) => await db.createUser(body))
)
```

## Middleware

Middleware is an Express middleware with a `type` controlling when it runs:

```ts
import { middleware, MiddlewareTypes } from '@zhttp/core'

const authMiddleware = middleware({
  name: 'auth',
  type: MiddlewareTypes.BEFORE,
  handler(req, res, next) {
    const token = req.headers.authorization
    if (token == null) throw new UnauthorizedError()
    // verify token...
    next()
  }
})
```

Types: `MiddlewareTypes.BEFORE` (runs before handler) and `MiddlewareTypes.AFTER` (runs after handler).

Middleware can be applied at three levels: server, controller, or endpoint.

### Execution order

```
Server BEFORE middlewares
  -> Controller BEFORE middlewares
    -> Endpoint BEFORE middlewares
      -> HANDLER
    -> Endpoint AFTER middlewares
  -> Controller AFTER middlewares
-> Server AFTER middlewares
```

## Server

```ts
import { Server, openapiController } from '@zhttp/core'

const server = new Server(
  {
    controllers: [usersController, openapiController],
    middlewares: [loggingMiddleware]
  },
  {
    port: 3000,
    allowedOrigins: ['http://localhost:3000'],
    oasInfo: { title: 'My API', version: '1.0.0' },
    trustProxy: true,          // default: true
    bodyParserOptions: { limit: '10mb' }
  }
)

await server.start()
await server.stop()
```

### Server options

| Option | Description |
|---|---|
| `port` | HTTP port |
| `allowedOrigins` | CORS allowed origins |
| `bypassAllowedOrigins` | Skip CORS checks entirely |
| `trustProxy` | Express trust proxy (default `true`) |
| `oasInfo` | OpenAPI metadata (`title`, `version`, etc.) |
| `logger` | Custom logger |
| `bodyParserOptions` | Options passed to `body-parser` |

The third constructor argument optionally accepts an existing Express app to bind to.

## API response wrapper

zhttp provides an optional envelope format for consistent response shapes:

```ts
import { apiResponse, zApiOutput } from '@zhttp/core'

const zUserResponse = zApiOutput(z.object({
  id: z.string(),
  name: z.string()
}))

get('/user', 'getUser')
  .response(zUserResponse)
  .handler(async () => {
    return apiResponse({ id: '123', name: 'Ada' })
  })

// Response sent to client:
// {
//   "meta": { "serverTime": "2025-01-01T00:00:00.000Z" },
//   "data": { "id": "123", "name": "Ada" }
// }
```

`zApiOutput(dataSchema)` wraps any Zod schema in `{ meta: { serverTime, error? }, data: <your schema> }`.

`apiResponse(data, opts?)` produces the envelope at runtime. Pass `{ error }` in opts to include error info in the meta.

Using the wrapper is optional — you can return plain objects from handlers and define `.response()` without `zApiOutput`.

## Error handling

### @zhttp/errors

Throw typed HTTP errors from handlers or middleware:

```ts
import {
  BadRequestError,       // 400
  ValidationError,       // 400 (input validation)
  UnauthorizedError,     // 401
  ForbiddenError,        // 403
  NotFoundError,         // 404
  ConflictError,         // 409
  TooManyRequestsError,  // 429
  InternalServerError,   // 500
  NotImplementedError    // 500
} from '@zhttp/errors'

throw new NotFoundError('User not found')
// -> 404 response with structured error body
```

All errors extend `ZHTTPError` which extends `Error`.

### Built-in error handler

zhttp has a built-in error handler middleware that:
- Catches all thrown errors
- Maps known `ZHTTPError` subclasses to appropriate HTTP status codes
- Returns unknown errors as 500 `InternalServerError`
- Logs errors with request context

### Validation errors

- **Input** validation failures -> 400 `ValidationError` with details (automatic)
- **Output** validation failures -> 500 `InternalServerError` + logged (automatic)

## OpenAPI

### Built-in OpenAPI controller

Include `openapiController` in your controllers to get:
- `GET /openapi.json` — the generated OpenAPI 3.0 spec
- `GET /api.html` — a RapiDoc interactive API explorer

```ts
import { openapiController } from '@zhttp/core'

const server = new Server({
  controllers: [myController, openapiController],
  middlewares: []
}, { oasInfo: { title: 'My API', version: '1.0.0' } })
```

### OpenAPI annotations on Zod schemas

```ts
import { extendZodWithOpenApi } from '@zhttp/core'
import { z } from 'zod'

extendZodWithOpenApi(z)

const zUser = z.object({
  id: z.string().uuid().openapi({ example: '550e8400-...' }),
  name: z.string().openapi({ example: 'Ada Lovelace' })
}).openapi('User')
```

Call `extendZodWithOpenApi(z)` once at startup to enable `.openapi()` on Zod schemas.

### Programmatic access

```ts
const spec = server.oasInstance.getJsonSpec()
```

## Key things to remember

- **No path prefixing.** Controllers do not add path prefixes. Every endpoint path is the complete route.
- **Handlers must be async.** Always use `async` for handler functions.
- **ESM preferred.** The library ships both ESM and CJS, but ESM is recommended.
- **Zod 4.** zhttp v2 requires Zod 4+. Use `ZodType` instead of deprecated `ZodSchema`.
