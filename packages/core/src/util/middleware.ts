import { type RequestHandler, type ErrorRequestHandler, type Request, type Response, type NextFunction } from 'express'
import { isPromise } from 'node:util/types'

export enum MiddlewareTypes {
  BEFORE,
  AFTER,
}

export type AsyncRequestHandler = (...args: Parameters<RequestHandler>) => Promise<ReturnType<RequestHandler>>

export type AsyncErrorRequestHandler = (...args: Parameters<ErrorRequestHandler>) => Promise<ReturnType<ErrorRequestHandler>>

export type MiddlewareHandler =
  | RequestHandler
  | ErrorRequestHandler
  | AsyncRequestHandler
  | AsyncErrorRequestHandler

function middlewareWrapper (middlewareHandler: MiddlewareHandler) {
  return function (prevError: Error, req: Request, res: Response, next: NextFunction) {
    try {
      if (isPromise(middlewareHandler)) {
        new Promise((resolve, reject) => {
          const localNext: NextFunction = (...params) => {
            resolve(...params)
          }
          if (middlewareHandler.arguments.length === 3) {
            const m = middlewareHandler as AsyncRequestHandler
            m(req, res, localNext).then(resolve).catch(reject)
          } else {
            const m = middlewareHandler as AsyncErrorRequestHandler
            m(prevError, req, res, localNext).then(resolve).catch(reject)
          }
        }).then(next).catch(next)
      }

      if (middlewareHandler.length === 3) {
        const m = middlewareHandler as RequestHandler
        m(req, res, next)
      } else {
        const m = middlewareHandler as ErrorRequestHandler
        m(prevError, req, res, next)
      }
    } catch (err) {
      next(err)
    }
  }
}

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
    return middlewareWrapper(this.options.handler)
  }
}

export const middleware = (options: MiddlewareProps) => new Middleware(options)
