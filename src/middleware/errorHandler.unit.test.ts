/* eslint-disable @typescript-eslint/no-floating-promises */
import { Server } from '../app.js'
import supertest, { type Response } from 'supertest'
import { expect } from 'chai'
import { describe, it, before, after } from 'node:test'
import { controller, get } from '../main.js'
import { BadRequestError, ConflictError } from '../util/errors.js'

describe('app', () => {
  let http: Server
  before(async () => {
    const testController = controller('test-controller').endpoints([
      get('/unhandled-error').handler(() => {
        throw new Error('Unhandled error')
      }),

      get('/bad-request').handler(() => {
        throw new BadRequestError('Something went wrong :(')
      }),

      get('/unique-violation').handler(() => {
        throw new ConflictError('Something went wrong :(')
      })
    ])

    http = new Server(
      {
        controllers: [testController]
      },
      { port: undefined }
    )

    await http.start()
  })

  after(async () => {
    await http.stop()
  })

  it('Can handle unhandled errors', (t, done) => {
    supertest(http.expressInstance).get('/unhandled-error').expect(500, done)
  })

  it('Can handle bad requests', (t, done) => {
    supertest(http.expressInstance)
      .get('/bad-request')
      .expect(400)
      .end((err: any, res: Response) => {
        if (err != null) { done(err); return }
        expect(res.body).to.have.property('meta')
        expect(res.body.meta.error).to.have.property('code', 'BadRequestError')
        done()
      })
  })

  it('Can handle unique violations', (t, done) => {
    supertest(http.expressInstance)
      .get('/unique-violation')
      .expect(409)
      .end((err: any, res: Response) => {
        if (err != null) { done(err); return }
        expect(res.body.meta.error).to.have.property('code', 'ConflictError')
        done()
      })
  })
})
