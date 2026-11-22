import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { createTestEnv } from '../../src/config/env';
import { createInMemoryDatabase, type DatabaseHandle } from '../../src/shared/db/client';
import { runMigrations } from '../../src/shared/db/migrate';
import { createRedis, type RedisHandle } from '../../src/shared/redis';
import { createEmailSender } from '../../src/shared/email';

describe('GET /api/health', () => {
  let app: FastifyInstance;
  let db: DatabaseHandle;
  let redis: RedisHandle;

  beforeAll(async () => {
    const env = createTestEnv();

    db = await createInMemoryDatabase();
    await runMigrations(db.runner);

    redis = createRedis(env);
    const email = createEmailSender(env);

    app = await buildApp({ env, deps: { db, redis, email } });
  });

  afterAll(async () => {
    await app.close();
    await db.close();
    await redis.close();
  });

  it('devuelve 200 con database y redis en up cuando ambos responden', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
      version: '0.1.0',
      uptimeSeconds: expect.any(Number),
    });
  });

  it('ejecuta una consulta real contra la base migrada', async () => {
    const rows = await db.runner.query<{ total: number }>(
      'select count(*)::int as total from users;',
    );

    expect(rows).toEqual([{ total: 0 }]);
  });
});
