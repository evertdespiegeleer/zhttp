/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test'
import { Server } from './app.js'
import { get } from './util/endpoint.js'
import z from 'zod'
import { zApiOutput, apiResponse } from './util/apiResponse.js'
import { controller } from './util/controller.js'
import sinon from 'sinon'
import supertest from 'supertest'
import express, { type Express } from 'express'
import { expect } from 'chai'

describe('app', () => {
  // Servertime is typically included in the api response, so we have to make sure the clock doesn't tick when checking responses
  let clock: sinon.SinonFakeTimers
  before(function () {
    clock = sinon.useFakeTimers()
  })

  after(function () {
    clock.restore()
  })

  let app: Express
  before(async () => {
    app = express()
  })

  it('Can bind to existing express app', async () => {
    const greetingController = controller('greetingController')
      .description('A controller which is responsible for greetings')

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

    const server = new Server({
      controllers: [greetingController]
    },
    undefined,
    app
    )

    // server.start()

    const helloRes = await supertest(server.expressInstance).get('/hello?name=Evert') as any

    expect(helloRes.status).to.be.equal(200)
    expect(helloRes.body).to.deep.eq(apiResponse('Hello Evert!'))
    expect(helloRes.body.meta).to.not.have.key('error')
  })
})
