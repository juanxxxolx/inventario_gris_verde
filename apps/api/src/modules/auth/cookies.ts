import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { Env } from '../../config/env';

export interface CookieNames {
  access: string;
  refresh: string;
  csrf: string;
}

export function cookieNames(env: Env): CookieNames {
  if (env.COOKIE_SECURE) {
    return {
      access: '__Host-ii_at',
      refresh: '__Secure-ii_rt',
      csrf: '__Host-ii_csrf',
    };
  }

  return { access: 'ii_at', refresh: 'ii_rt', csrf: 'ii_csrf' };
}

function baseOptions(env: Env): CookieSerializeOptions {
  return {
    secure: env.COOKIE_SECURE,
    sameSite: 'strict',
  };
}

export function accessCookieOptions(env: Env): CookieSerializeOptions {
  return {
    ...baseOptions(env),
    httpOnly: true,
    path: '/',
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS,
  };
}

export function refreshCookieOptions(env: Env): CookieSerializeOptions {
  return {
    ...baseOptions(env),
    httpOnly: true,
    path: '/api/auth',
    maxAge: env.REFRESH_TOKEN_TTL_SECONDS,
  };
}

export function csrfCookieOptions(env: Env): CookieSerializeOptions {
  return {
    ...baseOptions(env),
    httpOnly: false,
    path: '/',
    maxAge: 7_200,
  };
}

export function setAuthCookies(
  reply: FastifyReply,
  env: Env,
  input: { accessToken: string; refreshToken: string; csrfToken: string },
): void {
  const names = cookieNames(env);
  reply.setCookie(names.access, input.accessToken, accessCookieOptions(env));
  reply.setCookie(names.refresh, input.refreshToken, refreshCookieOptions(env));
  reply.setCookie(names.csrf, input.csrfToken, csrfCookieOptions(env));
}

export function setCsrfCookie(reply: FastifyReply, env: Env, csrfToken: string): void {
  reply.setCookie(cookieNames(env).csrf, csrfToken, csrfCookieOptions(env));
}

export function clearAuthCookies(reply: FastifyReply, env: Env): void {
  const names = cookieNames(env);
  reply.clearCookie(names.access, { path: '/' });
  reply.clearCookie(names.refresh, { path: '/api/auth' });
  reply.clearCookie(names.csrf, { path: '/' });
}

export function readAccessCookie(request: FastifyRequest, env: Env): string | undefined {
  return request.cookies[cookieNames(env).access];
}

export function readRefreshCookie(request: FastifyRequest, env: Env): string | undefined {
  return request.cookies[cookieNames(env).refresh];
}

export function readCsrfCookie(request: FastifyRequest, env: Env): string | undefined {
  return request.cookies[cookieNames(env).csrf];
}
