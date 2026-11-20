import { randomUUID } from 'node:crypto';
import Fastify, {
  type FastifyBaseLogger,
  type FastifyError,
  type FastifyInstance,
} from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import type { Logger } from 'pino';
import type { Env } from './config/env';
import type { DatabaseHandle } from './shared/db/client';
import type { RedisHandle } from './shared/redis';
import type { EmailHandle } from './shared/email';
import { PasswordHasher, createTokenService, safeEqual } from './shared/crypto';
import { RateLimiter } from './shared/rate-limit';
import { createLogger } from './shared/logger';
import {
  AppError,
  internalError,
  notFound,
  payloadTooLarge,
  unsupportedMediaType,
  validationError,
} from './shared/errors';
import { sendProblem } from './shared/problem';
import { readCsrfCookie } from './modules/auth/cookies';
import { AuthService } from './modules/auth/service';
import { registerAuthRoutes } from './modules/auth/routes';
import { registerHealthRoutes } from './modules/health/routes';
import { APP_VERSION } from './shared/version';

export interface AppDependencies {
  db: DatabaseHandle;
  redis: RedisHandle;
  email: EmailHandle;
}

export interface BuildAppOptions {
  env: Env;
  deps: AppDependencies;
  logger?: Logger;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { env, deps } = options;
  const logger = options.logger ?? createLogger(env);

  const app: FastifyInstance = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    trustProxy: env.TRUST_PROXY,
    bodyLimit: 64 * 1024,
    genReqId: () => randomUUID(),
    disableRequestLogging: env.NODE_ENV === 'test',
    ajv: { customOptions: { removeAdditional: false } },
  });

  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  });

  app.addHook('onRequest', async (request) => {
    if (!UNSAFE_METHODS.has(request.method)) {
      return;
    }

    const origin = request.headers.origin;
    if (
      typeof origin === 'string' &&
      origin !== env.APP_ORIGIN &&
      origin !== env.APP_PUBLIC_URL
    ) {
      throw new AppError({
        code: 'ORIGIN_NOT_ALLOWED',
        status: 403,
        title: 'Origen no permitido',
        message: 'El origen de la solicitud no está permitido.',
      });
    }

    if (!request.url.startsWith('/api/auth/')) {
      return;
    }

    const mediaType = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
    if (mediaType !== 'application/json') {
      throw unsupportedMediaType();
    }

    const cookieToken = readCsrfCookie(request, env);
    const headerToken = request.headers['x-csrf-token'];

    if (
      !cookieToken ||
      typeof headerToken !== 'string' ||
      !safeEqual(cookieToken, headerToken)
    ) {
      throw new AppError({
        code: 'CSRF_INVALID',
        status: 403,
        title: 'Solicitud no válida',
        message: 'No pudimos validar la solicitud. Recargá la página e intentá de nuevo.',
      });
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/auth')) {
      reply.header('cache-control', 'no-store');
    }
    return payload;
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      sendProblem(reply, error, request);
      return;
    }

    const code = typeof error.code === 'string' ? error.code : '';

    if (code === 'FST_ERR_CTP_INVALID_JSON' || code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
      sendProblem(
        reply,
        validationError([
          {
            field: 'body',
            code: 'INVALID_JSON',
            message: 'El cuerpo de la solicitud no es un JSON válido.',
          },
        ]),
        request,
      );
      return;
    }

    if (code === 'FST_ERR_CTP_BODY_TOO_LARGE' || error.statusCode === 413) {
      sendProblem(reply, payloadTooLarge(), request);
      return;
    }

    if (error.statusCode === 415) {
      sendProblem(reply, unsupportedMediaType(), request);
      return;
    }

    request.log.error({ err: error }, 'Error no controlado en la API.');

    if (env.NODE_ENV === 'test') {
      reply.header('x-error-message', error.message.slice(0, 200));
    }

    sendProblem(reply, internalError(), request);
  });

  app.setNotFoundHandler((request, reply) => {
    sendProblem(reply, notFound(), request);
  });

  const hasher = new PasswordHasher(env);
  const tokens = createTokenService(env);
  const rateLimiter = new RateLimiter(deps.redis.client);

  const service = new AuthService({
    env,
    db: deps.db.db,
    rateLimiter,
    hasher,
    tokens,
    email: deps.email.sender,
    logger,
  });

  registerHealthRoutes(app, {
    runner: deps.db.runner,
    redis: deps.redis.client,
    version: APP_VERSION,
  });

  registerAuthRoutes(app, { env, service });

  if (env.ENABLE_TEST_ENDPOINTS) {
    registerTestRoutes(app, deps);
  }

  return app;
}

function registerTestRoutes(app: FastifyInstance, deps: AppDependencies): void {
  const memory = deps.email.memory;
  if (!memory) {
    return;
  }

  app.get('/api/__test/last-email', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const email = typeof query['email'] === 'string' ? query['email'] : '';

    if (email.length === 0) {
      reply.code(400);
      return { message: 'El parámetro email es obligatorio.' };
    }

    const message = memory.latestFor(email);
    if (!message) {
      reply.code(404);
      return { message: 'No hay correos para esa dirección.' };
    }

    return {
      kind: message.kind,
      subject: message.subject,
      token: message.token ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  });
}
