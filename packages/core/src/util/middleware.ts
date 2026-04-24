import { type RequestHandler, type ErrorRequestHandler, type Request, type Response, type NextFunction } from 'express'
import { isPromise } from 'node:util/types'
import { loggerInstance } from './logger.js'

export enum MiddlewareTypes {
  BEFORE,
  AFTER,
}

export type BeforeMiddlewareHandler =
  (req: Request, res: Response, next: NextFunction) => void | Promise<void>

export type AfterMiddlewareHandler =
  (err: Error, req: Request, res: Response, next: NextFunction) => void | Promise<void>

export type MiddlewareHandler = BeforeMiddlewareHandler | AfterMiddlewareHandler

type MiddlewareProps =
  | { name?: string; handler: BeforeMiddlewareHandler; type: MiddlewareTypes.BEFORE }
  | { name?: string; handler: AfterMiddlewareHandler; type: MiddlewareTypes.AFTER }

const log = loggerInstance.logger('zhttp:middlewareHandler')

function middlewareWrapper (
  middlewareProps: MiddlewareProps
) {
  const middlewareHandler = middlewareProps.handler
  if (middlewareHandler.length === 3) {
    return async function (req: Request, res: Response, next: NextFunction) {
      if (res.headersSent) {
        log.info(
          `Exiting middleware ${middlewareProps.name} early, headers already sent`
        )
        next(); return
      }
      try {
        const m = middlewareHandler as BeforeMiddlewareHandler
        const result = m(req, res, next)
        if (isPromise(result)) {
          await result
        }
      } catch (err) {
        next(err)
      }
    } as RequestHandler
  }

  return async function (
    prevError: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    if (res.headersSent) {
      log.info(
        `Exiting middleware ${middlewareProps.name} early, headers already sent`
      )
      next(); return
    }
    try {
      const m = middlewareHandler as AfterMiddlewareHandler
      const result = m(prevError, req, res, next)
      if (isPromise(result)) {
        await result
      }
    } catch (err) {
      next(err)
    }
  } as ErrorRequestHandler
}

export class Middleware {
  constructor (private readonly options: MiddlewareProps) {}

  get type () {
    return this.options.type
  }

  get handler () {
    return middlewareWrapper(this.options)
  }
}

export const middleware = (
  options: MiddlewareProps
) => new Middleware(options)
