import { type Request, type Response, type NextFunction } from 'express'
import { MiddlewareTypes, middleware } from '../util/middleware.js'
import { apiResponse } from '../util/apiResponse.js'
import { ConflictError, ZHTTPError, InternalServerError } from '../util/errors.js'
import { type ILogger } from '../util/logger.js'

export const makeErrorHandlerMiddleware = (logger: ILogger) => middleware({
  name: 'ErrorHandler',
  type: MiddlewareTypes.AFTER,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler (
    originalError: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
  ) {
    let status = 500
    let parsedError = new InternalServerError()

    const log = logger('errorHandler')

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
    return res.end()
  }
})
