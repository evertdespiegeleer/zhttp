export type ILogger = (context: string) => {
  log: (...message: any[]) => unknown
  warn: (...message: any[]) => unknown
  error: (...message: any[]) => unknown
  info: (...message: any[]) => unknown
}

export const defaultLogger: ILogger = (context: string) => {
  const prefix = `[${context}]: `
  return {
    log: (message: string) => { console.log(`${prefix}${message}`) },
    warn: (message: string) => { console.warn(`${prefix}${message}`) },
    error: (message: string) => { console.error(`${prefix}${message}`) },
    info: (message: string) => { console.info(`${prefix}${message}`) }
  }
}

export const loggerInstance: {
  logger: ILogger
} = {
  logger: defaultLogger
}
