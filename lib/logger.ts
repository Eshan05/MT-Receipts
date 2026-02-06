export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

export interface Logger {
  child(extra: LogContext): Logger
  debug(message: string, extra?: LogContext): void
  info(message: string, extra?: LogContext): void
  warn(message: string, extra?: LogContext): void
  error(message: string, extra?: LogContext): void
}

const LEVEL_TO_CONSOLE: Record<LogLevel, 'log' | 'warn' | 'error'> = {
  debug: 'log',
  info: 'log',
  warn: 'warn',
  error: 'error',
}

function safeSerialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }
  return value
}

function write(level: LogLevel, payload: Record<string, unknown>) {
  const consoleMethod = LEVEL_TO_CONSOLE[level]
  const line = JSON.stringify(payload, (_key, value) => safeSerialize(value))
  // eslint-disable-next-line no-console
  console[consoleMethod](line)
}

export function createLogger(baseContext: LogContext = {}): Logger {
  const base = { ...baseContext }

  const logger: Logger = {
    child(extra) {
      return createLogger({ ...base, ...extra })
    },
    debug(message, extra) {
      write('debug', {
        ts: new Date().toISOString(),
        level: 'debug',
        msg: message,
        ...base,
        ...(extra || {}),
      })
    },
    info(message, extra) {
      write('info', {
        ts: new Date().toISOString(),
        level: 'info',
        msg: message,
        ...base,
        ...(extra || {}),
      })
    },
    warn(message, extra) {
      write('warn', {
        ts: new Date().toISOString(),
        level: 'warn',
        msg: message,
        ...base,
        ...(extra || {}),
      })
    },
    error(message, extra) {
      write('error', {
        ts: new Date().toISOString(),
        level: 'error',
        msg: message,
        ...base,
        ...(extra || {}),
      })
    },
  }

  return logger
}
