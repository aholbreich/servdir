import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, resetLoggerForTests, resolveLogColor, resolveLogFormat, resolveLogLevel } from './logger';

describe('resolveLogFormat', () => {
  afterEach(() => {
    delete process.env.LOG_FORMAT;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_COLOR;
    resetLoggerForTests();
  });

  it('defaults to text output', () => {
    expect(resolveLogFormat()).toBe('text');
  });

  it('uses json when LOG_FORMAT is set accordingly', () => {
    process.env.LOG_FORMAT = 'json';
    expect(resolveLogFormat()).toBe('json');
  });

  it('falls back to text for empty or unsupported values', () => {
    process.env.LOG_FORMAT = '';
    expect(resolveLogFormat()).toBe('text');

    process.env.LOG_FORMAT = 'pretty';
    expect(resolveLogFormat()).toBe('text');
  });

  it('defaults log level to info', () => {
    expect(resolveLogLevel()).toBe('info');
  });

  it('uses LOG_LEVEL when set to a supported value', () => {
    process.env.LOG_LEVEL = 'debug';
    expect(resolveLogLevel()).toBe('debug');
  });

  it('defaults log color to auto', () => {
    expect(resolveLogColor()).toBe('auto');
  });

  it('uses LOG_COLOR when set to a supported value', () => {
    process.env.LOG_COLOR = 'true';
    expect(resolveLogColor()).toBe('true');
  });
});

describe('createLogger', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetLoggerForTests();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    delete process.env.LOG_FORMAT;
    delete process.env.LOG_LEVEL;
    delete process.env.LOG_COLOR;
    resetLoggerForTests();
    vi.restoreAllMocks();
  });

  it('emits readable text logs by default', () => {
    const logger = createLogger('logger-test-text');
    expect(resolveLogFormat()).toBe('text');
    expect(() => {
      logger.info('Catalog snapshot refreshed', {
        serviceCount: 7,
        snapshotStatus: 'fresh',
      });
    }).not.toThrow();
  });

  it('emits structured json logs when configured', () => {
    process.env.LOG_FORMAT = 'json';
    resetLoggerForTests();
    const logger = createLogger('logger-test-json');

    logger.error('Sync cycle failed', {
      trigger: 'interval',
      durationMs: 2500,
      error: new Error('boom'),
    });

    const logged = stdoutSpy.mock.calls
      .map(([chunk]) => String(chunk))
      .find((entry) => entry.includes('"component":"logger-test-json"'));
    expect(logged).toEqual(expect.any(String));

    const parsed = JSON.parse(String(logged));
    expect(parsed).toMatchObject({
      level: 'error',
      component: 'logger-test-json',
      msg: 'Sync cycle failed',
      trigger: 'interval',
      durationMs: 2500,
      err: {
        type: 'Error',
        message: 'boom',
      },
    });
    expect(parsed.time).toEqual(expect.any(String));
  });
});
