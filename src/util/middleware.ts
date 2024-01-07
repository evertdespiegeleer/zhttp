import { type RequestHandler, type ErrorRequestHandler } from 'express'
import asyncMiddleware from 'middleware-async'
import { isPromise } from 'node:util/types'

export enum MiddlewareTypes {
  BEFORE,
  AFTER,
}

export type MiddlewareHandler =
  | RequestHandler
  | ErrorRequestHandler
  | Promise<RequestHandler | ErrorRequestHandler>

interface MiddlewareProps {
  name?: string
  handler: MiddlewareHandler
  type: MiddlewareTypes
}

export class Middleware {
  constructor (private readonly options: MiddlewareProps) {}

  get type () {
    return this.options.type
  }

  get handler () {
    if (isPromise(this.options.handler)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return asyncMiddleware(this.options.handler as any) as RequestHandler
    }
    return this.options.handler as RequestHandler
  }
}

export const middleware = (options: MiddlewareProps) => new Middleware(options)
