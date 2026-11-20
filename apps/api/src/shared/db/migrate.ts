import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SqlRunner } from './client';

interface AppliedMigration {
  version: string;
  checksum: string;
  [key: string]: unknown;
}

const MIGRATIONS_TABLE = 'schema_migrations';

function checksum(sqlText: string): string {
  return createHash('sha256').update(sqlText, 'utf8').digest('hex');
}

function escapeLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

export async function runMigrations(
  runner: SqlRunner,
  migrationsDir = path.resolve(process.cwd(), 'drizzle/migrations'),
): Promise<string[]> {
  await runner.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const appliedRows = await runner.query<AppliedMigration>(
    `SELECT version, checksum FROM ${MIGRATIONS_TABLE} ORDER BY version ASC;`,
  );
  const applied = new Map(appliedRows.map((row) => [row.version, row.checksum]));

  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.up.sql')).sort();

  const migrated: string[] = [];

  for (const file of files) {
    const version = file.replace(/\.up\.sql$/u, '');
    const sqlText = await readFile(path.join(migrationsDir, file), 'utf8');
    const fileChecksum = checksum(sqlText);
    const previousChecksum = applied.get(version);

    if (previousChecksum) {
      if (previousChecksum !== fileChecksum) {
        throw new Error(
          `La migración ${version} ya fue aplicada con otro contenido. No se puede continuar.`,
        );
      }
      continue;
    }

    await runner.exec('BEGIN;');
    try {
      await runner.exec(sqlText);
      await runner.exec(
        `INSERT INTO ${MIGRATIONS_TABLE} (version, checksum) VALUES ('${escapeLiteral(version)}', '${fileChecksum}');`,
      );
      await runner.exec('COMMIT;');
      migrated.push(version);
    } catch (error) {
      await runner.exec('ROLLBACK;');
      throw error;
    }
  }

  return migrated;
}
