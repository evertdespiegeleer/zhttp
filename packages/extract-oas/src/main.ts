#!/usr/bin/env node

import { register } from 'tsx/esm/api'
register()

import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { stringify as yamlStringify } from 'yaml'

const argv = await yargs(hideBin(process.argv))
  .option('serverfile', {
    type: 'string',
    alias: 'i',
    demandOption: true,
    describe: 'Path to the server file'
  })
  .option('serverexport', {
    type: 'string',
    demandOption: true,
    describe: 'Name of the exported Server instance'
  })
  .option('output', {
    type: 'string',
    alias: 'o',
    demandOption: true,
    describe: 'Output file path'
  })
  .option('type', {
    type: 'string',
    alias: 't',
    choices: ['json', 'yaml'] as const,
    default: 'json' as const,
    describe: 'Output format'
  })
  .strict()
  .help()
  .parseAsync()

const serverFilePath = resolve(process.cwd(), argv.serverfile)
const serverFileUrl = pathToFileURL(serverFilePath).href

let serverModule: Record<string, unknown>
try {
  serverModule = await import(serverFileUrl)
} catch (err) {
  console.error(`Failed to import server file: ${serverFilePath}`)
  console.error(err)
  process.exit(1)
}

const serverInstance = serverModule[argv.serverexport]
if (serverInstance == null) {
  console.error(`Export "${argv.serverexport}" not found in ${serverFilePath}`)
  console.error(`Available exports: ${Object.keys(serverModule).join(', ')}`)
  process.exit(1)
}

if (typeof (serverInstance as any).oasInstance?.getJsonSpec !== 'function') {
  console.error(`Export "${argv.serverexport}" does not have an oasInstance with getJsonSpec()`)
  process.exit(1)
}

const jsonSpec = (serverInstance as any).oasInstance.getJsonSpec() as string
const outputPath = resolve(process.cwd(), argv.output)

let content: string
if (argv.type === 'yaml') {
  content = yamlStringify(JSON.parse(jsonSpec))
} else {
  content = JSON.stringify(JSON.parse(jsonSpec), null, 2)
}

await writeFile(outputPath, content, 'utf-8')
console.log(`OpenAPI spec written to ${outputPath}`)
// Force exit to avoid any lingering processes (e.g. from the server file)
process.exit(0)