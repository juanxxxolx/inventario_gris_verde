import type { FastifyInstance } from 'fastify';
import type { HealthResponse } from '@induinventory/contracts';
import type { SqlRunner } from '../../shared/db/client';
import type { RedisClient } from '../../shared/redis';

interface HealthDeps {
  runner: SqlRunner;
  redis: RedisClient;
  version: string;
}

export function registerHealthRoutes(app: FastifyInstance, deps: HealthDeps): void {
  const startedAt = process.hrtime.bigint();

  app.get('/api/health', async (_request, reply) => {
    const [database, redis] = await Promise.all([
      deps.runner
        .query<{ ok: number }>('select 1 as ok')
        .then(() => 'up' as const)
        .catch(() => 'down' as const),
      deps.redis
        .ping()
        .then(() => 'up' as const)
        .catch(() => 'down' as const),
    ]);

    const status: HealthResponse['status'] =
      database === 'up' && redis === 'up' ? 'ok' : 'degraded';

    if (status === 'degraded') {
      reply.code(503);
    }

    return {
      status,
      checks: { database, redis },
      version: deps.version,
      uptimeSeconds: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e9),
    } satisfies HealthResponse;
  });
}
