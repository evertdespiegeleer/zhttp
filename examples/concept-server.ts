import { Server } from '@zhttp/core'
import { greetingController } from './concept-controller.js'
import { lastVisitMiddleware } from './concept-middleware.js'

const server = new Server({
  controllers: [greetingController],
  middlewares: [lastVisitMiddleware]
}, {
  port: 8080
})

// eslint-disable-next-line @typescript-eslint/no-floating-promises
server.start()
