import { type ZodRawShape, type ZodString, type ZodObject, type ZodSchema } from 'zod'
import type z from 'zod'
import type { NextFunction, Request, Response } from 'express'
import { type Middleware } from './middleware.js'
import { type EndpointOasInfo } from '../oas.js'
import { NotImplementedError, ValidationError } from '@zhttp/errors'

const methods = [
  'get',
  'put',
  'post',
  'delete',
  'head',
  'options',
  'patch',
  'trace'
] as const
export type Method = (typeof methods)[number]

type ExtractRouteParams<Path extends string> = string extends Path
  ? Record<string, ZodString>
  : // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Path extends `${infer _Start}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractRouteParams<Rest>]?: ZodString }
    : // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Path extends `${infer _Start}:${infer Param}`
      ? { [K in Param]: ZodString }
      : ZodRawShape

export type InputValidationSchema<Path extends string> = ZodObject<{
  params?: ZodObject<ExtractRouteParams<Path>>
  query?: ZodObject<Record<string, ZodSchema>>
  body?: ZodSchema
}>

export type ResponseValidationSchema = ZodSchema

export interface EndpointOptions<
  Path extends string,
  InputsSchema extends
  InputValidationSchema<Path> = InputValidationSchema<Path>,
  OutputSchema extends ResponseValidationSchema = ResponseValidationSchema,
> {
  method: Method
  path: Path
  name?: string
  description?: string
  oasInfo?: Partial<EndpointOasInfo>
  // TODO: everything inside inputs is actually part of req. Maybe it shouldn't be passed as a separate object?
  handler?: (
    inputs: z.infer<InputsSchema>,
    req: Request,
    res: Response,
  ) => Promise<z.infer<OutputSchema>>
  inputValidationSchema?: InputsSchema
  responseValidationSchema?: OutputSchema
  responseContentType: string
  middlewares?: Middleware[]
}

export class Endpoint<
  Path extends string = string,
  InputsSchema extends
  InputValidationSchema<Path> = InputValidationSchema<Path>,
  OutputSchema extends ResponseValidationSchema = ResponseValidationSchema,
> {
  constructor (
    private readonly options: EndpointOptions<Path, InputsSchema, OutputSchema>
  ) {}

  /** Add a description to the endpoint */
  description (description: (typeof this.options)['description']) {
    this.options.description = description
    return this
  }

  /** Name the endpoint */
  name (name: (typeof this.options)['name']) {
    this.options.name = name
    return this
  }

  /** Add openapi properties to the endpoint, which will be reflected in the openapi spec */
  oas (oasInfo: (typeof this.options)['oasInfo']) {
    this.options.oasInfo = oasInfo
    return this
  }

  /** Specify a zod input schema for the endpoint.
   * Must be a zod object on which the following properties are allowed: params, query, body.
   *
   * @example
   * ```ts
   * ...
   * .input(z.object({
   *   query: z.object({
   *     name: z.string(),
   *     age: z.number().optional()
   *   })
   * }))
   * ```
   * */
  input<NewInputsSchema extends InputValidationSchema<Path>>(
    inputValidationSchema: NewInputsSchema
  ) {
    return new Endpoint<Path, NewInputsSchema, OutputSchema>({
      ...this.options,
      inputValidationSchema
    })
  }

  /** Specify a zod output schema for the endpoint. Corresponds to the body of the HTTP response.
   * @example
   * ```ts
   * ...
   * .output(zApiResponse(z.object({
   *   greeting: z.string()
   * })))
   * ```
   * */
  response<NewOutputSchema extends OutputSchema>(
    responseValidationSchema: NewOutputSchema
  ) {
    return new Endpoint<Path, InputsSchema, NewOutputSchema>({
      ...this.options,
      responseValidationSchema
    })
  }

  /**
   * Specify the response content type. Defaults to `application/json`.
   * @example
   * ```ts
   *...
   *.responseContentType('text/plain')
   * ```
   * */
  responseContentType (contentType: string) {
    this.options.responseContentType = contentType
    return this
  }

  /** Define the handler of the endpoint. Should be an async function.
   * The return type should correspond to the response schema.
   * @example
   * ```ts
   * ...
   * .handler(async (input, req, res) => {
   *   return {
   *     greeting: `Hello ${input.query.name ?? 'everybody}!`
   *   }
   * })
   * ```
   * */
  handler (
    handler: (
      inputs: z.infer<InputsSchema>,
      req: Request,
      res: Response,
    ) => Promise<z.infer<OutputSchema>>
  ) {
    this.options.handler = handler
    return this
  }

  /** Add an array of middlewares to the endpoint */
  middlewares (middlewares: Middleware[]) {
    this.options.middlewares = [
      ...(this.options.middlewares ?? []),
      ...middlewares
    ]
    return this
  }

  /** Add a middleware to the endpoint */
  middleware (middleware: Middleware) {
    this.options.middlewares = [
      ...(this.options.middlewares ?? []),
      middleware
    ]
    return this
  }

  getName () {
    return this.options.name
  }

  getDescription () {
    return this.options.description
  }

  getMiddlewares () {
    return this.options.middlewares
  }

  getHandler () {
    return this.options.handler
  }

  getOasInfo () {
    return this.options.oasInfo
  }

  getMethod () {
    return this.options.method
  }

  getPath () {
    return this.options.path
  }

  getInputValidationSchema () {
    return this.options.inputValidationSchema
  }

  getResponseValidationSchema () {
    return this.options.responseValidationSchema
  }

  getResponseContentType () {
    return this.options.responseContentType
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEndpoint = Endpoint<string, any, any>

/** Define a new endpoint */
export const endpoint = <Path extends string>(
  method: Method,
  path: Path,
  name?: string
) =>
    new Endpoint<Path>({
      name,
      method,
      path,
      responseContentType: 'application/json'
    })

/** Define a new GET endpoint */
export const get = <Path extends string>(path: Path, name?: string) =>
  endpoint('get', path, name)

/** Define a new PUT endpoint */
export const put = <Path extends string>(path: Path, name?: string) =>
  endpoint('put', path, name)

/** Define a new POST endpoint */
export const post = <Path extends string>(path: Path, name?: string) =>
  endpoint('post', path, name)

/** Define a new DELETE endpoint */
export const del = <Path extends string>(path: Path, name?: string) =>
  endpoint('delete', path, name)

export const endpointToExpressHandler = (endpoint: AnyEndpoint) => {
  const endpointHandler = (req: Request, res: Response, next: NextFunction) => {
    // Input validation
    try {
      endpoint.getInputValidationSchema()?.parse(req)
    } catch (error) {
      const e = error as z.ZodError
      next(new ValidationError(e.message, e.issues))
      return
    }

    const { params, query, body } = req

    if (endpoint.getHandler() == null) {
      next(new NotImplementedError())
      return
    }

    endpoint
      .getHandler()?.({ params, query, body }, req, res)
      .then((responseObj) => {
        // Output validation
        try {
          endpoint.getResponseValidationSchema()?.parse(responseObj)
        } catch (error) {
          const e = error as z.ZodError
          next(new ValidationError(e.message, e.issues))
          return
        }

        res.header('content-type', endpoint.getResponseContentType())
        res.send(responseObj)
      })
      .catch((e) => {
        next(e)
      })
  }

  return endpointHandler
}
