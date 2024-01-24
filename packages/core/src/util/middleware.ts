import { type RequestHandler, type ErrorRequestHandler, type Request, type Response, type NextFunction } from 'express'
import { isPromise } from 'node:util/types'
import { loggerInstance } from './logger.js'

export enum MiddlewareTypes {
  BEFORE,
  AFTER,
}

export type AsyncRequestHandler = (
  ...args: Parameters<RequestHandler>
) => Promise<ReturnType<RequestHandler>>

export type AsyncErrorRequestHandler = (
  ...args: Parameters<ErrorRequestHandler>
) => Promise<ReturnType<ErrorRequestHandler>>

export type MiddlewareHandler =
  | RequestHandler
  | ErrorRequestHandler
  | AsyncRequestHandler
  | AsyncErrorRequestHandler

interface MiddlewareProps {
  name?: string
  handler: MiddlewareHandler
  type: MiddlewareTypes
}

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
        if (isPromise(middlewareHandler)) {
          await new Promise((resolve, reject) => {
            const localNext: NextFunction = (...params) => {
              resolve(...params)
            }
            const m = middlewareHandler as AsyncRequestHandler
            m(req, res, localNext).then(resolve).catch(reject)
          })
            .then(next)
            .catch(next); return
        }
        const m = middlewareHandler as RequestHandler
        m(req, res, next)
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
      if (isPromise(middlewareHandler)) {
        await new Promise((resolve, reject) => {
          const localNext: NextFunction = (...params) => {
            resolve(...params)
          }
          const m = middlewareHandler as AsyncErrorRequestHandler
          m(prevError, req, res, localNext).then(resolve).catch(reject)
        })
          .then(next)
          .catch(next); return
      }

      const m = middlewareHandler as ErrorRequestHandler
      m(prevError, req, res, next)
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
