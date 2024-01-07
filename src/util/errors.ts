/* c8 ignore start */
import { type ZodIssue as ZValidationError } from 'zod'

export class ZHTTPError extends Error {
  public http: number
  constructor (message: string) {
    super(message)
    this.http = 500
    this.name = this.constructor.name
  }
}

export class InternalServerError extends ZHTTPError {
  constructor () {
    super('Internal server error')
    this.http = 500
  }
}

export class ConfigError extends ZHTTPError {
  constructor (message: string) {
    super(`ConfigError: ${message}`)
    this.http = 500
  }
}

export class NotImplementedError extends ZHTTPError {
  constructor () {
    super('Not implemented')
    this.http = 500
  }
}

export class ValidationError extends ZHTTPError {
  constructor (
    message: string,
    public details?: ZValidationError[]
  ) {
    super(message)

    if (details?.length != null && details.length > 0) {
      this.message = `${message}: ${details[0]?.message}`
    }

    this.http = 400
  }
}

export class BadRequestError extends ZHTTPError {
  constructor (message: string = 'Bad request') {
    super(message)
    this.http = 400
  }
}

/**
 * Intentionally does not accept metadata.
 * log additional info and do not leak info to the client
 */
export class UnauthorizedError extends ZHTTPError {
  constructor () {
    super('Not authorized')
    this.http = 401
  }
}

/**
 * Intentionally does not accept metadata.
 * log additional info and do not leak info to the client
 */
export class ForbiddenError extends ZHTTPError {
  constructor () {
    super('Forbidden')
    this.http = 403
  }
}

export class NotFoundError extends ZHTTPError {
  constructor (message = 'Not found') {
    super(message)
    this.http = 404
  }
}

export class ConflictError extends ZHTTPError {
  constructor (message = 'Conflict') {
    super(message)
    this.http = 409
  }
}

export class TooManyRequestsError extends ZHTTPError {
  constructor (message = 'Too many requests') {
    super(message)
    this.http = 429
  }
}
/* c8 ignore stop */
