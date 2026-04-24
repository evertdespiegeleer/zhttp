import { ConflictError, InternalServerError, ZHTTPError } from '@zhttp/errors'
import type { NextFunction, Request, Response } from 'express'
import { apiResponse } from '../util/apiResponse.js'
import { loggerInstance } from '../util/logger.js'
import { MiddlewareTypes, middleware } from '../util/middleware.js'

export const errorHandlerMiddleware = middleware({
  name: 'ErrorHandler',
  type: MiddlewareTypes.AFTER,
  handler(originalError: Error, req: Request, res: Response, _next: NextFunction) {
    let status = 500
    let parsedError = new InternalServerError()

    const log = loggerInstance.logger('errorHandler')

    if (originalError.name === 'UniqueViolationError') {
      status = 409
      parsedError = new ConflictError(parsedError.message)
    }

    if (originalError instanceof ZHTTPError) {
      status = originalError.http
      parsedError = originalError
    }

    // log.error(originalError);
    if (status >= 500) {
      log.error(`🔴 FAIL ${req.method} ${req.originalUrl}`, parsedError)
    } else {
      log.warn(`⚠️ FAIL ${req.method} ${req.originalUrl}`, parsedError)
    }

    res.status(status).json(apiResponse({}, { error: parsedError }))
    res.end()
  }
})
