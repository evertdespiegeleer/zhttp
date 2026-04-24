import { after, before, describe, it } from 'node:test'
import { NotImplementedError, ValidationError } from '@zhttp/errors'
import { expect } from 'chai'
import type { NextFunction, Request, Response } from 'express'
import sinon from 'sinon'
import { z } from 'zod'
import { apiResponse, zApiOutput } from './apiResponse.js'
import { endpoint, endpointToExpressHandler } from './endpoint.js'

const promisifyExpressHandler = async (
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request
) =>
  await new Promise<{ response: any; error: any }>((resolve) => {
    let response: any
    let error: any

    const mockRes = {
      send: (resObject: unknown) => {
        response = resObject
        resolve({ response, error })
      },
      header: () => {}
    } as unknown as Response

    const mockNext = ((err: Error) => {
      error = err
      resolve({ response, error })
    }) as unknown as NextFunction

    handler(req, mockRes, mockNext)
  })

describe('endpoint', () => {
  // Servertime is typically included in the api response, so we have to make sure the clock doesn't tick when checking responses
  let clock: sinon.SinonFakeTimers
  before(() => {
    clock = sinon.useFakeTimers()
  })

  after(() => {
    clock.restore()
  })

  // This test doesn't actually expect anything, it's about the typing of the test itself and not running into errors when defining it
  it('Can be defined with correct typing', async () => {
    endpoint('get', '/hello', 'hello')
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
  })

  it('Can be run as an Express handler', async () => {
    const helloEndpoint = endpoint('get', '/hello', 'hello')
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

    const expressHandler = endpointToExpressHandler(helloEndpoint)

    const mockReq = {
      query: {
        name: 'Satan'
      }
    } as unknown as Request

    const { error, response } = await promisifyExpressHandler(expressHandler, mockReq)

    expect(response).to.deep.eq(apiResponse('Hello Satan!'))
    expect(error).to.be.undefined
  })

  it('Can throw a validation error', async () => {
    const helloEndpoint = endpoint('get', '/hello', 'hello')
      .description('Say hello to everyone')
      .input({
        query: z.object({
          name: z.string().min(10)
        })
      })
      .response(zApiOutput(z.string()))
      .handler(async ({ query }) => {
        return apiResponse(`Hello ${query.name ?? 'everyone'}!`)
      })

    const expressHandler = endpointToExpressHandler(helloEndpoint)

    const mockReq = {
      query: {
        name: 'Jos'
      }
    } as unknown as Request

    const { error, response } = await promisifyExpressHandler(expressHandler, mockReq)

    expect(error).to.be.instanceOf(ValidationError)
    expect(response).to.be.undefined
  })

  it('Can throw a not implemented error', async () => {
    const helloEndpoint = endpoint('get', '/hello', 'hello')
      .description('Say hello to everyone')
      .input({
        query: z.object({
          name: z.string()
        })
      })
      .response(zApiOutput(z.string()))

    const expressHandler = endpointToExpressHandler(helloEndpoint)

    const mockReq = {
      query: {
        name: 'Jos'
      }
    } as unknown as Request

    const { error, response } = await promisifyExpressHandler(expressHandler, mockReq)

    expect(error).to.be.instanceOf(NotImplementedError)
    expect(response).to.be.undefined
  })
})
