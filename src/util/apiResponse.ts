import { z } from 'zod';

interface IApiResponseOptions {
  error?: Error;
  meta?: Record<string, string | number>;
}

export function apiResponse<DataType = unknown>(
  data: DataType,
  opts?: IApiResponseOptions,
) {
  if (opts?.error) {
    const errorDetails = {
      code: opts.error?.name ?? 'InternalServerError',

      details: opts.error?.hasOwnProperty('details')
        ? // @ts-expect-error Error typing is weird in ts... but we validate during runtime so should be OK
          opts.error?.details
        : {},
    };

    return {
      meta: {
        serverTime: new Date().toISOString(),
        error: errorDetails,
        ...opts?.meta,
      },
      data,
    } satisfies z.infer<typeof zGenericApiOutput>;
  }

  return {
    meta: {
      serverTime: new Date().toISOString(),
      ...opts?.meta,
    },
    data,
  } satisfies z.infer<typeof zGenericApiOutput>;
}

const zErrorOutput = z.object({
  code: z.string(),
  details: z.any(),
});

const zMetaDataOutput = z.object({
  serverTime: z.string().datetime(),
  error: zErrorOutput.optional(),
});

/**
 * Schema wrapper for a default api output schema
 *
 * @example
 * ```ts
 * zApiOutput(
 *   z.object({
 *     greeting: z.string()
 *   })
 * )
 * ```
 * @returns
 * ```ts
 * z.object({
 *   meta: z.object({
 *     serverTime: z.string().datetime(),
 *     ...
 *   }),
 *   data: z.object({
 *     greeting: z.string()
 *   })
 * })
 * ```
 */
export const zApiOutput = <OutputSchema extends z.ZodSchema>(
  dataSchema: OutputSchema,
) =>
  z.object({
    meta: zMetaDataOutput,
    data: dataSchema,
  });

const zGenericApiOutput = zApiOutput(z.any());
