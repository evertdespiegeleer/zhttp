import { type NextFunction, type Request, type Response } from 'express'
import { Counter } from 'prom-client'
import { MiddlewareTypes, middleware } from '../util/middleware.js'

const metrics = {
  httpRequests: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status']
  })
}

export const metricMiddleware = middleware({
  name: 'metricMiddleware',
  type: MiddlewareTypes.BEFORE,
  handler (req: Request, res: Response, next: NextFunction) {
    res.once('finish', () => {
      metrics.httpRequests.inc({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode
      })
    })
    next()
  }
})
