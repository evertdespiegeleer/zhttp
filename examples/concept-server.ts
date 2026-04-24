import { Server } from '@zhttp/core'
import { greetingController } from './concept-controller.js'
import { lastVisitMiddleware } from './concept-middleware.js'

export const server = new Server(
  {
    controllers: [greetingController],
    middlewares: [lastVisitMiddleware]
  },
  {
    port: 8080
  }
)

server.start()
