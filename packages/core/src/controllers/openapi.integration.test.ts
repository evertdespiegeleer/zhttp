/* eslint-disable @typescript-eslint/no-floating-promises */
import { Server } from '../app.js'
import supertest from 'supertest'
import { describe, it, before, after } from 'node:test'
import { openapiController } from './openapi.js'

describe('openapiController', () => {
  let http: Server
  before(async () => {
    http = new Server({
      controllers: [openapiController]
    }, { port: undefined })
    await http.start()
  })

  after(async () => {
    await http.stop()
  })

  it('Serves a open api spec', (t, done) => {
    supertest(http.expressInstance).get('/openapi.json').expect(200, done)
  })

  it('Serves api docs', (t, done) => {
    supertest(http.expressInstance).get('/api.html').expect(200, done)
  })
})
