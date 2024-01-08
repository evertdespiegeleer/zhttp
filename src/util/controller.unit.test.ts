/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test'
import { get } from './endpoint.js'
import z from 'zod'
import { zApiOutput, apiResponse } from './apiResponse.js'
import { bindControllerToApp, controller } from './controller.js'
import sinon from 'sinon'
import supertest from 'supertest'
import express, { type Express } from 'express'
import { expect } from 'chai'

describe('controller', () => {
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

  // This test doesn't actually expect anything, it's about the typing of the test itself and not running into errors when defining it
  it('Can be defined with correct typing', async () => {
    controller('greetingController')
      .description('A controller which is responsible for greetings')
      .endpoints([
        get('/hello')
          .description('Say hello to everyone')
          .input(
            z.object({
              query: z.object({
                name: z.string().optional()
              })
            })
          )
          .response(zApiOutput(z.string()))
          .handler(async ({ query }) => {
            return apiResponse(`Hello ${query.name ?? 'everyone'}!`)
          })
      ])
  })

  it('Can correctly bind to an express app', async () => {
    const greetingController = controller('greetingController')
      .description('A controller which is responsible for greetings')
      .endpoints([
        get('/hello')
          .description('Say hello to everyone')
          .input(
            z.object({
              query: z.object({
                name: z.string().min(5).optional()
              })
            })
          )
          .response(zApiOutput(z.string()))
          .handler(async ({ query }) => {
            return apiResponse(`Hello ${query.name ?? 'everyone'}!`)
          }),

        get('/goodbye')
          .description('Say goodbye to everyone')
          .input(
            z.object({
              query: z.object({
                name: z.string().min(5).optional()
              })
            })
          )
          .response(zApiOutput(z.string()))
          .handler(async ({ query }) => {
            return apiResponse(`Goodbye ${query.name ?? 'everyone'}!`)
          })
      ])

    bindControllerToApp(greetingController, app)

    // eslint-disable-next-line @typescript-eslint/await-thenable
    const helloRes = await supertest(app).get('/hello?name=Evert') as any

    expect(helloRes.status).to.be.equal(200)
    expect(helloRes.body).to.deep.eq(apiResponse('Hello Evert!'))
    expect(helloRes.body.meta).to.not.have.key('error')

    // eslint-disable-next-line @typescript-eslint/await-thenable
    const goodbyeRes = await supertest(app).get('/goodbye?name=Evert') as any

    expect(goodbyeRes.status).to.be.equal(200)
    expect(goodbyeRes.body).to.deep.eq(apiResponse('Goodbye Evert!'))
    expect(goodbyeRes.body.meta).to.not.have.key('error')
  })
})
