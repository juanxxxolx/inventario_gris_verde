import path from 'node:path';
import { loadEnv } from '../config/env';
import { createDatabase } from '../shared/db/client';
import { runMigrations } from '../shared/db/migrate';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = await createDatabase(env);

  try {
    const applied = await runMigrations(
      db.runner,
      path.resolve(process.cwd(), 'drizzle/migrations'),
    );
    if (applied.length === 0) {
      process.stdout.write('No hay migraciones pendientes.\n');
    } else {
      process.stdout.write(`Migraciones aplicadas: ${applied.join(', ')}\n`);
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Error al migrar: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
