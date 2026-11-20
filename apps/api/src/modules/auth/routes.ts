import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type AuthResponse,
  type MessageResponse,
} from '@induinventory/contracts';
import type { Env } from '../../config/env';
import { parseWithSchema } from '../../shared/validation';
import { generateCsrfToken } from '../../shared/crypto';
import type { AuthService } from './service';
import { toUserDto } from './service';
import {
  clearAuthCookies,
  readAccessCookie,
  readCsrfCookie,
  readRefreshCookie,
  setAuthCookies,
  setCsrfCookie,
} from './cookies';

interface AuthRoutesDeps {
  env: Env;
  service: AuthService;
}

function requestContext(request: FastifyRequest): { ip?: string; userAgent?: string } {
  const userAgent = request.headers['user-agent'];
  return {
    ip: request.ip,
    ...(typeof userAgent === 'string' ? { userAgent } : {}),
  };
}

export function readAccessToken(request: FastifyRequest, env: Env): string | undefined {
  const cookieToken = readAccessCookie(request, env);
  if (cookieToken) {
    return cookieToken;
  }

  const header = request.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : undefined;
  }

  return undefined;
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRoutesDeps): void {
  const { env, service } = deps;

  app.get('/api/auth/csrf', async (request, reply) => {
    const existing = readCsrfCookie(request, env);
    const csrfToken = existing ?? generateCsrfToken();

    if (!existing) {
      setCsrfCookie(reply, env, csrfToken);
    }

    return { csrfToken };
  });

  app.post('/api/auth/register', async (request, reply) => {
    const input = parseWithSchema(registerSchema, request.body);
    const result = await service.register(input, requestContext(request));
    reply.code(201);
    return result;
  });

  app.post('/api/auth/verify-email', async (request) => {
    const input = parseWithSchema(verifyEmailSchema, request.body);
    await service.verifyEmail(input);
    return {
      message: 'Tu correo fue verificado. Ya podés iniciar sesión.',
    } satisfies MessageResponse;
  });

  app.post('/api/auth/resend-verification', async (request, reply) => {
    const input = parseWithSchema(resendVerificationSchema, request.body);
    await service.resendVerification(input, requestContext(request));
    reply.code(202);
    return {
      message: 'Si el correo corresponde a una cuenta sin verificar, te enviamos un nuevo enlace.',
    } satisfies MessageResponse;
  });

  app.post('/api/auth/login', async (request, reply) => {
    const input = parseWithSchema(loginSchema, request.body);
    const session = await service.login(input, requestContext(request));

    setAuthCookies(reply, env, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      csrfToken: session.csrfToken,
    });

    return {
      user: toUserDto(session.user),
      csrfToken: session.csrfToken,
    } satisfies AuthResponse;
  });

  app.post('/api/auth/refresh', async (request, reply) => {
    const session = await service.rotateRefreshToken(
      readRefreshCookie(request, env),
      requestContext(request),
    );

    setAuthCookies(reply, env, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      csrfToken: session.csrfToken,
    });

    return {
      user: toUserDto(session.user),
      csrfToken: session.csrfToken,
    } satisfies AuthResponse;
  });

  app.post('/api/auth/logout', async (request, reply) => {
    await service.logout(readRefreshCookie(request, env));
    clearAuthCookies(reply, env);
    reply.code(204);
    return null;
  });

  app.get('/api/auth/me', async (request) => {
    const user = await service.currentUser(readAccessToken(request, env));
    return { user: toUserDto(user) };
  });

  app.post('/api/auth/forgot-password', async (request, reply) => {
    const input = parseWithSchema(forgotPasswordSchema, request.body);
    await service.forgotPassword(input, requestContext(request));
    reply.code(202);
    return {
      message:
        'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.',
    } satisfies MessageResponse;
  });

  app.post('/api/auth/reset-password', async (request) => {
    const input = parseWithSchema(resetPasswordSchema, request.body);
    await service.resetPassword(input);
    return {
      message: 'Tu contraseña se actualizó. Iniciá sesión con la nueva contraseña.',
    } satisfies MessageResponse;
  });
}
