import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'byte-email',
  },
})

/**
 * Create a child logger with request-scoped context.
 * Use this to trace a single email's journey through the system.
 */
export function createRequestLogger(context: Record<string, unknown>) {
  return logger.child(context)
}
