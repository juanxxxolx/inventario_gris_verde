import pino, { type Logger } from 'pino';
import type { Env } from '../config/env';

export function createLogger(env: Env): Logger {
  const options: pino.LoggerOptions = {
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    base: { service: 'induinventory-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'password',
        'confirmPassword',
        'newPassword',
        'token',
        'accessToken',
        'refreshToken',
        'csrfToken',
        '*.password',
        '*.confirmPassword',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
  };

  if (env.NODE_ENV === 'development') {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return pino(options);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}
