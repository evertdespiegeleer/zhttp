import {
  endpointToExpressHandler,
  type AnyEndpoint
} from './endpoint.js'
import { type Application } from 'express'
import { type Middleware, MiddlewareTypes } from './middleware.js'

interface ControllerOptions {
  name?: string
  description?: string
  middlewares: Middleware[]
  endpoints: AnyEndpoint[]
}

export class Controller {
  constructor (private readonly options: ControllerOptions) {}

  /** Add a description to the controller */
  description (description: typeof this.options.description) {
    this.options.description = description
    return this
  }

  /** Add an endpoint to the controller */
  endpoint (endpoint: AnyEndpoint) {
    this.options.endpoints.push(endpoint)
    return this
  }

  /** Add an array of endpoints to the controller */
  endpoints (endpoints: AnyEndpoint[]) {
    this.options.endpoints.push(...endpoints)
    return this
  }

  /** Add a middleware to the controller */
  middleware (middleware: Middleware) {
    this.options.middlewares.push(middleware)
    return this
  }

  /** Add an array of middlewares to the controller */
  middlewares (middlewares: Middleware[]) {
    this.options.middlewares.push(...middlewares)
    return this
  }

  getEndpoints () {
    return this.options.endpoints
  }

  getMiddlewares () {
    return this.options.middlewares
  }

  getName () {
    return this.options.name
  }

  getDescription () {
    return this.options.description
  }
}

export const controller = (name: string) =>
  new Controller({
    name,
    endpoints: [],
    middlewares: []
  })

export const bindControllerToApp = (
  controller: Controller,
  app: Application
) => {
  const controllerBeforeMiddlewares = controller
    .getMiddlewares()
    .filter((m) => m.type === MiddlewareTypes.BEFORE)
  const controllerAfterMiddlewares = controller
    .getMiddlewares()
    .filter((m) => m.type === MiddlewareTypes.AFTER)

  controller.getEndpoints().forEach((endpoint) => {
    app[endpoint.getMethod()](
      endpoint.getPath(),
      // Controller before middleware
      ...controllerBeforeMiddlewares.map((m) => m.handler),

      // Endpoint before middleware
      ...(endpoint.getMiddlewares() ?? [])
        .filter((m) => m.type === MiddlewareTypes.BEFORE)
        .map((m) => m.handler),

      // Endpoint handler
      endpointToExpressHandler(endpoint),

      // Endpoint after middleware
      ...(endpoint.getMiddlewares() ?? [])
        .filter((m) => m.type === MiddlewareTypes.AFTER)
        .map((m) => m.handler),

      // Controller after middleware
      ...controllerAfterMiddlewares.map((m) => m.handler)
    )
  })
}
