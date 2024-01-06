/* c8 ignore start */
import { ZodIssue as ZValidationError } from 'zod';

export class HttpzError extends Error {
  public http: number;
  constructor(message: string) {
    super(message);
    this.http = 500;
    this.name = this.constructor.name;
  }
}

export class InternalServerError extends HttpzError {
  constructor() {
    super('Internal server error');
    this.http = 500;
  }
}

export class ConfigError extends HttpzError {
  constructor(message: string) {
    super(`ConfigError: ${message}`);
    this.http = 500;
  }
}

export class NotImplementedError extends HttpzError {
  constructor() {
    super('Not implemented');
    this.http = 500;
  }
}

export class ValidationError extends HttpzError {
  constructor(
    message: string,
    public details?: ZValidationError[],
  ) {
    super(message);

    if (details?.length) {
        this.message = `${message}: ${details[0]?.message}`
    }

    this.http = 400;
  }
}

export class BadRequestError extends HttpzError {
  constructor(message: string = 'Bad request') {
    super(message);
    this.http = 400;
  }
}

/**
 * Intentionally does not accept metadata.
 * log additional info and do not leak info to the client
 */
export class UnauthorizedError extends HttpzError {
  constructor() {
    super('Not authorized');
    this.http = 401;
  }
}

/**
 * Intentionally does not accept metadata.
 * log additional info and do not leak info to the client
 */
export class ForbiddenError extends HttpzError {
  constructor() {
    super('Forbidden');
    this.http = 403;
  }
}

export class NotFoundError extends HttpzError {
  constructor(message = 'Not found') {
    super(message);
    this.http = 404;
  }
}

export class ConflictError extends HttpzError {
  constructor(message = 'Conflict') {
    super(message);
    this.http = 409;
  }
}

export class TooManyRequestsError extends HttpzError {
  constructor(message = 'Too many requests') {
    super(message);
    this.http = 429;
  }
}
/* c8 ignore stop */
