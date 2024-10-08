/* eslint-disable @typescript-eslint/ban-types */
import express, { type Application } from 'express'
import { type Server as NodeHttpServer, createServer } from 'node:http'
import cors from 'cors'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import { type Controller, bindControllerToApp } from './util/controller.js'
import { type Middleware, MiddlewareTypes } from './util/middleware.js'
import { errorHandlerMiddleware } from './middleware/errorHandler.js'
import { metricMiddleware } from './middleware/metrics.js'
import { type OASInfo, Oas } from './oas.js'
import { BadRequestError } from '@zhttp/errors'
import { type ILogger, defaultLogger, loggerInstance } from './util/logger.js'

interface RoutingOptions {
  controllers?: Controller[]
  middlewares?: Middleware[]
}

interface IHTTPOptions {
  port?: number
  allowedOrigins?: string[]
  bypassAllowedOrigins?: boolean
  trustProxy?: boolean
  oasInfo?: OASInfo
  logger?: ILogger
  bodyParserOptions?: bodyParser.OptionsJson
}

export let oasInstance: Oas

export class Server {
  private readonly app: Application
  private httpServer: NodeHttpServer
  private readonly appLogger

  constructor (
    private readonly options: RoutingOptions = {},
    private readonly httpOptions: IHTTPOptions = {},
    private readonly externalApplication?: Application
  ) {
    loggerInstance.logger = httpOptions.logger ?? defaultLogger
    this.appLogger = loggerInstance.logger('zhttp')

    oasInstance = new Oas(httpOptions.oasInfo)

    // Apply defaults
    this.httpOptions = {
      trustProxy: true,
      ...this.httpOptions
    }

    this.app = this.externalApplication ?? express()
    this.httpServer = createServer(this.app)

    this.app.set('trust proxy', this.httpOptions.trustProxy)
    this.app.use(bodyParser.json(httpOptions.bodyParserOptions))
    this.app.use(
      cors({
        credentials: true,
        origin: (origin: string | undefined, callback: CallableFunction) => {
          if (origin == null || origin === 'null') return callback(null, true)
          const allowedOrigins = this.httpOptions.allowedOrigins ?? []
          if (
            origin == null ||
            allowedOrigins.includes(origin) ||
            this.httpOptions.bypassAllowedOrigins === true
          ) {
            callback(null, true)
          } else {
            this.appLogger.warn(`Origin ${origin} not allowed`)
            callback(new BadRequestError('Not allowed by CORS'))
          }
        }
      })
    )
    this.app.use(cookieParser())

    // Set default middlewares
    this.options.middlewares = [
      ...(this.options.middlewares ?? []),
      metricMiddleware,
      errorHandlerMiddleware
    ]

    // run all global before middlewares
    this.options.middlewares
      ?.filter((m) => m.type === MiddlewareTypes.BEFORE)
      .forEach((middleware) => {
        this.app.use(middleware.handler)
      })

    // Bind all controllers
    this.options.controllers?.forEach((controller) => {
      // Bind all controllers to the express app
      bindControllerToApp(controller, this.app)
      oasInstance.addController(controller)
    })

    // run all global after middlewares
    this.options.middlewares
      ?.filter((m) => m.type === MiddlewareTypes.AFTER)
      .forEach((middleware) => {
        this.app.use(middleware.handler)
      })
  }

  get expressInstance () {
    return this.app
  }

  get oasInstance () {
    return oasInstance
  }

  get server () {
    return this.httpServer
  }

  async start () {
    this.httpServer = this.httpServer.listen(this.httpOptions.port, () => {
      this.appLogger.info(
        `HTTP server listening on port ${this.httpOptions.port}`
      )
    })
  }

  async stop () {
    if (this.httpServer != null) {
      this.httpServer.close()
      this.appLogger.info('HTTP server stopped')
    }
  }
}
