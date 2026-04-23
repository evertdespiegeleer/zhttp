/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, before, after } from 'node:test'
import { endpoint, endpointToExpressHandler, get } from './endpoint.js'
import z from 'zod'
import { zApiOutput, apiResponse } from './apiResponse.js'
import express, { type Response, type Request, type NextFunction, type Express } from 'express'
import sinon from 'sinon'
import { NotImplementedError, ValidationError } from '@zhttp/errors'
import supertest from 'supertest';
import { expect } from 'chai'
import { bindControllerToApp, controller } from './controller.js'

const promisifyExpressHandler = async (
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) =>
  await new Promise<{ response: any, error: any }>((resolve) => {
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
  let clock: sinon.SinonFakeTimers;
  let app: Express;

  before(function () {
    clock = sinon.useFakeTimers();
    app = express();
  });

  after(function () {
    clock.restore();
  });

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

    const { error, response } = await promisifyExpressHandler(
      expressHandler,
      mockReq
    )

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

    const { error, response } = await promisifyExpressHandler(
      expressHandler,
      mockReq
    )

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

    const { error, response } = await promisifyExpressHandler(
      expressHandler,
      mockReq
    )

    expect(error).to.be.instanceOf(NotImplementedError)
    expect(response).to.be.undefined
  })

  it('Can support regex in the endpoint', async () => {
    const testController = controller('testController')
      .description('A controller just to test regex support in endpoints')
      .endpoints([
        get('/resources/:resourceId((?!except)[a-zA-Z0-9]{6})')
          .description('Should be able to get a resource by id of 6 alphanumeric chars with exception of "except"')
          .input(
            z.object({
              params: z.object({
                resourceId: z.string(),
              }),
            }),
          )
          .handler(async ({ params: { resourceId } }) => {
            return apiResponse({ resourceId });
          }),
      ]);

    bindControllerToApp(testController, app);

    const existingEndpoint = await supertest(app).get('/resources/abc123');
    expect(existingEndpoint?.status).to.eq(200);

    const nonExistingEndpoint = await supertest(app).get('/resources/abc123toolong');
    expect(nonExistingEndpoint?.status).to.eq(404);

    const nonMatchedExceptionEndpoint = await supertest(app).get('/resources/except');
    expect(nonMatchedExceptionEndpoint?.status).to.eq(404);
  });
})
