import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { createTestEnv } from '../../src/config/env';

describe('createTestEnv', () => {
  it('devuelve un entorno de test válido con los valores base', () => {
    const env = createTestEnv();

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3000);
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(env.ENABLE_TEST_ENDPOINTS).toBe(true);
    expect(env.AUTO_MIGRATE).toBe(false);
    expect(env.LOG_LEVEL).toBe('silent');
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.REDIS_URL).toBeUndefined();
    expect(env.SMTP_HOST).toBeUndefined();
  });

  it('aplica los overrides recibidos sin alterar el resto de los valores', () => {
    const env = createTestEnv({ PORT: 4321, ACCESS_TOKEN_TTL_SECONDS: 120 });

    expect(env.PORT).toBe(4321);
    expect(env.ACCESS_TOKEN_TTL_SECONDS).toBe(120);
    expect(env.HOST).toBe('127.0.0.1');
  });

  it('rechaza un JWT_SECRET de menos de 32 caracteres', () => {
    expect(() => createTestEnv({ JWT_SECRET: 'demasiado-corto' })).toThrow(ZodError);
  });

  it('rechaza un puerto fuera del rango permitido', () => {
    expect(() => createTestEnv({ PORT: 70_000 })).toThrow(ZodError);
  });

  it('rechaza endpoints de prueba cuando NODE_ENV es production', () => {
    expect(() => createTestEnv({ NODE_ENV: 'production', ENABLE_TEST_ENDPOINTS: true })).toThrow(
      ZodError,
    );
  });

  it('exige SMTP_PASSWORD cuando se define SMTP_USER', () => {
    expect(() => createTestEnv({ SMTP_USER: ' usuario@example.com ' })).toThrow(ZodError);
  });
});
