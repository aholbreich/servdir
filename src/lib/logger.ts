import pino, { type Logger as PinoLogger } from 'pino';
import pretty from 'pino-pretty';
import { Writable } from 'node:stream';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFormat = 'text' | 'json';
export type LogColor = 'auto' | 'true' | 'false';
export type LogFields = Record<string, unknown>;

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LoggerApi = Record<LogLevel, (message: string, fields?: LogFields) => void>;

function readRuntimeEnv(name: keyof ImportMetaEnv): string | undefined {
  const processValue = process.env[name];
  if (typeof processValue === 'string' && processValue.length > 0) {
    return processValue;
  }

  // Astro can expose values from `.env` through import.meta.env in dev mode
  // without mirroring them into process.env. Prefer the real runtime env,
  // then fall back so `.env` keeps working locally.
  const importMetaEnv = import.meta.env as Record<string, unknown>;
  const viteValue = importMetaEnv[name];
  return typeof viteValue === 'string' && viteValue.length > 0 ? viteValue : undefined;
}

export function resolveLogFormat(): LogFormat {
  const raw = readRuntimeEnv('LOG_FORMAT')?.trim().toLowerCase();
  return raw === 'json' ? 'json' : 'text';
}

export function resolveLogLevel(): LogLevel {
  const raw = readRuntimeEnv('LOG_LEVEL')?.trim().toLowerCase();

  if (raw && LOG_LEVELS.includes(raw as LogLevel)) {
    return raw;
  }

  return 'info';
}

export function resolveLogColor(): LogColor {
  const raw = readRuntimeEnv('LOG_COLOR')?.trim().toLowerCase();

  if (raw === 'true' || raw === 'false' || raw === 'auto') {
    return raw;
  }

  return 'auto';
}

function shouldColorizeTextLogs(): boolean {
  const color = resolveLogColor();

  if (color === 'true') {
    return true;
  }

  if (color === 'false') {
    return false;
  }

  return Boolean(process.stdout.isTTY);
}

function formatTextValue(value: unknown): string {
  if (typeof value === 'string') {
    return /\s|=|"/.test(value) ? JSON.stringify(value) : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  return JSON.stringify(value);
}

function renderTextFields(fields: LogFields): string {
  const entries = Object.entries(fields)
    .filter(([key, value]) => key !== 'err' && value !== undefined)
    .map(([key, value]) => `${key}=${formatTextValue(value)}`);

  return entries.length > 0 ? ` ${entries.join(' ')}` : '';
}

function sanitizeFields(fields: LogFields): LogFields {
  const sanitized: LogFields = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    if (value instanceof Error) {
      // `err` is the conventional Pino error field. Keep that shape for the
      // primary error, but flatten any secondary Error objects for text output.
      if (key === 'error') {
        sanitized.err = value;
      } else {
        sanitized[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
}

function createStdoutStream(): Writable {
  return new Writable({
    write(chunk, encoding, callback) {
      process.stdout.write(chunk, encoding as BufferEncoding, callback);
    },
  });
}

function createRootLogger(): PinoLogger {
  const options = {
    base: undefined,
    level: resolveLogLevel(),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
  };

  const format = resolveLogFormat();

  if (format === 'json') {
    return pino(options, createStdoutStream());
  }

  return pino(
    options,
    pretty({
      colorize: shouldColorizeTextLogs(),
      singleLine: true,
      sync: true,
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
      translateTime: 'SYS:standard',
      destination: 1,
    }),
  );
}

let rootLogger: PinoLogger | undefined;
let rootLoggerFormat: LogFormat | undefined;
let rootLoggerLevel: LogLevel | undefined;
let rootLoggerColor: LogColor | undefined;

function getRootLogger(): PinoLogger {
  const format = resolveLogFormat();
  const level = resolveLogLevel();
  const color = resolveLogColor();

  if (
    !rootLogger ||
    rootLoggerFormat !== format ||
    rootLoggerLevel !== level ||
    rootLoggerColor !== color
  ) {
    rootLogger = createRootLogger();
    rootLoggerFormat = format;
    rootLoggerLevel = level;
    rootLoggerColor = color;
  }

  return rootLogger;
}

export function resetLoggerForTests(): void {
  rootLogger = undefined;
  rootLoggerFormat = undefined;
  rootLoggerLevel = undefined;
  rootLoggerColor = undefined;
}

function emit(level: LogLevel, component: string, message: string, fields: LogFields = {}): void {
  const sanitizedFields = sanitizeFields(fields);

  if (resolveLogFormat() === 'text') {
    const logger = getRootLogger();
    const renderedMessage = `[${component}] ${message}${renderTextFields(sanitizedFields)}`;
    const err = sanitizedFields.err;

    if (err instanceof Error) {
      logger[level]({ err }, renderedMessage);
      return;
    }

    logger[level](renderedMessage);
    return;
  }

  const logger = getRootLogger().child({ component });
  logger[level](sanitizedFields, message);
}

export function createLogger(component: string): LoggerApi {
  return {
    debug(message: string, fields?: LogFields): void {
      emit('debug', component, message, fields);
    },
    info(message: string, fields?: LogFields): void {
      emit('info', component, message, fields);
    },
    warn(message: string, fields?: LogFields): void {
      emit('warn', component, message, fields);
    },
    error(message: string, fields?: LogFields): void {
      emit('error', component, message, fields);
    },
  };
}
