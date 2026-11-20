import { loadEnv } from './config/env';
import { createLogger } from './shared/logger';
import { createDatabase } from './shared/db/client';
import { runMigrations } from './shared/db/migrate';
import { createRedis } from './shared/redis';
import { createEmailSender } from './shared/email';
import { buildApp } from './app';

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);

  const db = await createDatabase(env);
  const redis = createRedis(env);
  const email = createEmailSender(env);

  if (env.AUTO_MIGRATE) {
    const applied = await runMigrations(db.runner);
    if (applied.length > 0) {
      logger.info({ applied }, 'Migraciones aplicadas.');
    }
  }

  const app = await buildApp({
    env,
    logger,
    deps: { db, redis, email },
  });

  if (env.NODE_ENV === 'production') {
    app.addHook('onResponse', async (request, reply) => {
      request.log.debug(
        { statusCode: reply.statusCode, elapsedMs: Math.round(reply.elapsedTime) },
        'Respuesta enviada.',
      );
    });
  }

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'Cerrando la API.');

    try {
      await app.close();
      await db.close();
      await redis.close();
    } catch (error) {
      logger.error({ err: error }, 'Error durante el cierre.');
      process.exitCode = 1;
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  await app.listen({ port: env.PORT, host: env.HOST });

  logger.info(
    { port: env.PORT, host: env.HOST, database: db.kind, redis: redis.kind, email: email.kind },
    'InduInventory API en línea.',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `No se pudo iniciar la API: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
