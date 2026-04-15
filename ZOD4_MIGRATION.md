# Zod 4 Migration Changelog

## Overview

Migrated zhttp from Zod 3 (`^3.22.4`) to Zod 4 (`^4.0.0`). This is a breaking change for consumers who import Zod alongside zhttp — they must also upgrade to Zod 4.

## Dependency Changes

| Package | Old Version | New Version |
|---------|-------------|-------------|
| `zod` | `^3.22.4` | `^4.0.0` |
| `@asteasolutions/zod-to-openapi` | `^6.3.1` | `^8.0.0` |
| `typescript` | `^4.4.4` | `^5.5.0` |
| `@typescript-eslint/eslint-plugin` | `^6.4.0` | `^7.0.0` |
| `@typescript-eslint/parser` | `^6.18.1` | `^7.0.0` |

### Removed Dependencies

- `eslint-config-standard-with-typescript` — abandoned upstream, incompatible with `@typescript-eslint` v7+. ESLint config switched to `eslint:recommended` + `plugin:@typescript-eslint/recommended`.
- `eslint-plugin-n` — was a peer dependency of the removed config.
- `eslint-plugin-promise` — was a peer dependency of the removed config.

## Code Changes

### Import Style: `import z from 'zod'` -> `import { z } from 'zod'`

The default import (`import z from 'zod'`) used in some files was changed to the named import (`import { z } from 'zod'`). The import path remains `'zod'` — the `/v4` suffix is only needed when running Zod 3 and 4 side-by-side.

### Type Rename: `ZodSchema` -> `ZodType`

`ZodSchema` is a deprecated alias in Zod 4. Replaced with `ZodType` in:

- `packages/core/src/util/endpoint.ts` — `InputValidationSchema` and `ResponseValidationSchema` type definitions
- `packages/core/src/util/apiResponse.ts` — `zApiOutput` generic constraint

### `ExtractRouteParams` — Removed Optional Modifier

In `packages/core/src/util/endpoint.ts`, the `ExtractRouteParams` type for multi-segment paths (`/:param1/:param2/rest`) previously marked properties as optional (`?:`). Zod 4's `ZodObject` shape type (`Readonly<Record<string, ZodType>>`) does not allow `undefined` values, so the optional modifier was removed. This is semantically correct — route parameters extracted from a path pattern are always present.

**Before:**
```typescript
Path extends `${infer _Start}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ExtractRouteParams<Rest>]?: ZodString }
```

**After:**
```typescript
Path extends `${infer _Start}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ExtractRouteParams<Rest>]: ZodString }
```

### `.input()` Method — Type Assertion

The `Endpoint.input()` method spreads `this.options` into a new `Endpoint` with a different `InputsSchema` generic. In Zod 4, the stricter type inference for `ZodObject` causes a type mismatch on the `handler` property (which is typed for the old `InputsSchema`). Since the handler is typically `undefined` at the point `.input()` is called in the fluent chain, this is safely resolved with `as any`.

### ESLint Configuration

`.eslintrc.json` changed from `"extends": "standard-with-typescript"` to:
```json
"extends": [
  "eslint:recommended",
  "plugin:@typescript-eslint/recommended"
]
```

## Files Modified

| File | Change |
|------|--------|
| `package.json` | TypeScript, ESLint dep versions |
| `packages/core/package.json` | zod, zod-to-openapi, TypeScript versions |
| `packages/errors/package.json` | zod, TypeScript versions |
| `.eslintrc.json` | ESLint config migration |
| `packages/core/src/util/endpoint.ts` | Import style, `ZodSchema`->`ZodType`, `ExtractRouteParams` fix, `.input()` cast |
| `packages/core/src/util/apiResponse.ts` | `ZodSchema`->`ZodType` |
| `packages/core/src/util/endpoint.unit.test.ts` | Import style |
| `packages/core/src/util/controller.unit.test.ts` | Import style |
| `packages/core/src/app.integration.test.ts` | Import style |

## What Did NOT Change

- **Public API** — All exported types (`InputValidationSchema`, `ResponseValidationSchema`, `Method`, `Endpoint`, etc.) retain the same shape. The `ZodSchema` -> `ZodType` rename is internal to the type definitions; consumers using `z.infer<>`, `z.output<>`, `z.input<>` are unaffected.
- **Runtime behavior** — `.parse()`, `.safeParse()`, `z.object()`, `z.string()`, `.optional()`, `.min()`, etc. all work identically.
- **OpenAPI generation** — `@asteasolutions/zod-to-openapi` v8 is fully compatible. `extendZodWithOpenApi()`, `OpenAPIRegistry`, and `OpenApiGeneratorV3` APIs are unchanged.
- **Error types** — `ZodIssue`, `ZodError` still exist and work the same way.

## Notes for Consumers

- Zod 4 requires **TypeScript 5.5+** with `"strict": true` in tsconfig.
- Import Zod as `import { z } from 'zod'`.
- `z.string().email()`, `.datetime()`, etc. still work but are also available as standalone `z.email()`, `z.datetime()`.
- Zod 4 includes native `z.toJSONSchema()` for converting schemas to JSON Schema / OpenAPI 3.0 schema format.
