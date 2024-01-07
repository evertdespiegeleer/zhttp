/* eslint-disable @typescript-eslint/ban-types */
import express, { Application } from 'express';
import { Server as NodeHttpServer, createServer } from 'node:http';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { Controller, bindControllerToApp } from './util/controller.js';
import { Middleware, MiddlewareTypes } from './util/middleware.js';
import { makeErrorHandlerMiddleware } from './middleware/errorHandler.js';
import { metricMiddleware } from './middleware/metrics.js';
import { OASInfo, Oas } from './oas.js';
import { BadRequestError } from './util/errors.js';
import { ILogger, defaultLogger } from './util/logger.js';

interface RoutingOptions {
  controllers?: Controller[];
  middlewares?: Middleware[];
}

interface IHTTPOptions {
  port?: number;
  allowedOrigins?: string[];
  bypassAllowedOrigins?: boolean;
  trustProxy?: boolean;
  oasInfo?: OASInfo;
  logger?: ILogger;
}

export let oasInstance: Oas;

export class Server {
  private app: Application;
  private httpServer: NodeHttpServer;
  private logger: ILogger;
  private loggerInstance;

  constructor(
    private options: RoutingOptions = {},
    private httpOptions: IHTTPOptions = {},
  ) {
    this.logger = httpOptions.logger ?? defaultLogger;
    this.loggerInstance = this.logger('zhttp');

    oasInstance = new Oas(httpOptions.oasInfo);

    // Apply defaults
    this.httpOptions = {
      trustProxy: true,
      ...this.httpOptions,
    };

    this.app = express();
    this.httpServer = createServer(this.app);

    this.app.set('trust proxy', this.httpOptions.trustProxy);
    this.app.use(bodyParser.json());
    this.app.use(
      cors({
        credentials: true,
        origin: (origin: string | undefined, callback: CallableFunction) => {
          if (!origin || origin === 'null') return callback(null, true);
          const allowedOrigins = this.httpOptions.allowedOrigins ?? [];
          if (
            !origin ||
            allowedOrigins.includes(origin) ||
            this.httpOptions.bypassAllowedOrigins
          ) {
            callback(null, true);
          } else {
            this.loggerInstance.warn(`Origin ${origin} not allowed`);
            callback(new BadRequestError('Not allowed by CORS'));
          }
        },
      }),
    );
    this.app.use(cookieParser());

    // Set default middlewares
    this.options.middlewares = [
      ...(this.options.middlewares ?? []),
      metricMiddleware,
      makeErrorHandlerMiddleware(this.logger),
    ];

    // run all global before middlewares
    this.options.middlewares
      ?.filter((m) => m.type === MiddlewareTypes.BEFORE)
      .forEach((middleware) => {
        this.app.use(middleware.handler);
      });

    // Bind all controllers
    this.options.controllers?.forEach((controller) => {
      // Bind all controllers to the express app
      bindControllerToApp(controller, this.app);
      oasInstance.addController(controller);
    });

    // run all global after middlewares
    this.options.middlewares
      ?.filter((m) => m.type === MiddlewareTypes.AFTER)
      .forEach((middleware) => {
        this.app.use(middleware.handler);
      });
  }

  get expressInstance() {
    return this.app;
  }

  get oasInstance() {
    return oasInstance;
  }

  get server() {
    return this.httpServer;
  }

  async start() {
    this.httpServer = this.httpServer.listen(this.httpOptions.port, () => {
      this.loggerInstance.info(
        `HTTP server listening on port ${this.httpOptions.port}`,
      );
    });
  }

  async stop() {
    if (this.httpServer) {
      this.httpServer.close();
      this.loggerInstance.info('HTTP server stopped');
    }
  }
}
