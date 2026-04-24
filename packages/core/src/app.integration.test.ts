import { after, before, describe, it } from 'node:test'
import { expect } from 'chai'
import express, { type Express } from 'express'
import sinon from 'sinon'
import supertest from 'supertest'
import { z } from 'zod'
import { Server } from './app.js'
import { apiResponse, zApiOutput } from './util/apiResponse.js'
import { controller } from './util/controller.js'
import { get } from './util/endpoint.js'

describe('app', () => {
  // Servertime is typically included in the api response, so we have to make sure the clock doesn't tick when checking responses
  let clock: sinon.SinonFakeTimers
  before(() => {
    clock = sinon.useFakeTimers()
  })

  after(() => {
    clock.restore()
  })

  let app: Express
  before(async () => {
    app = express()
  })

  it('Can bind to existing express app', async () => {
    const greetingController = controller('greetingController').description(
      'A controller which is responsible for greetings'
    )

    greetingController.endpoint(
      get('/hello')
        .description('Say hello to everyone')
        .input({
          query: z.object({
            name: z.string().optional()
          })
        })
        .response(zApiOutput(z.string()))
        .handler(async ({ query }) => {
          return apiResponse(`Hello ${query.name ?? 'everyone'}!`)
        })
    )

    const server = new Server(
      {
        controllers: [greetingController]
      },
      undefined,
      app
    )

    // server.start()

    const helloRes = (await supertest(server.expressInstance).get('/hello?name=Evert')) as any

    expect(helloRes.status).to.be.equal(200)
    expect(helloRes.body).to.deep.eq(apiResponse('Hello Evert!'))
    expect(helloRes.body.meta).to.not.have.key('error')
  })
})
