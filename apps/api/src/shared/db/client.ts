import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import type { Env } from '../../config/env';
import { schema } from './schema';

export type AppDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;
export type DbExecutor = Pick<
  AppDatabase,
  'select' | 'insert' | 'update' | 'delete' | 'execute'
>;

export interface SqlRunner {
  exec(sqlText: string): Promise<void>;
  query<T extends Record<string, unknown>>(sqlText: string): Promise<T[]>;
}

export interface DatabaseHandle {
  db: AppDatabase;
  runner: SqlRunner;
  kind: 'postgres' | 'pglite';
  close(): Promise<void>;
}

export async function createDatabase(env: Env): Promise<DatabaseHandle> {
  if (env.DATABASE_URL) {
    const sql = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    const db = drizzlePostgres(sql, { schema }) as unknown as AppDatabase;

    return {
      db,
      kind: 'postgres',
      runner: {
        async exec(sqlText: string): Promise<void> {
          await sql.unsafe(sqlText);
        },
        async query<T extends Record<string, unknown>>(sqlText: string): Promise<T[]> {
          const rows = await sql.unsafe<T[]>(sqlText);
          return rows;
        },
      },
      async close(): Promise<void> {
        await sql.end({ timeout: 5 });
      },
    };
  }

  const client = new PGlite(env.PGLITE_DATA_DIR);
  await client.waitReady;
  const db = drizzlePglite(client, { schema }) as unknown as AppDatabase;

  return {
    db,
    kind: 'pglite',
    runner: {
      async exec(sqlText: string): Promise<void> {
        await client.exec(sqlText);
      },
      async query<T extends Record<string, unknown>>(sqlText: string): Promise<T[]> {
        const result = await client.query<T>(sqlText);
        return result.rows;
      },
    },
    async close(): Promise<void> {
      await client.close();
    },
  };
}

export async function createInMemoryDatabase(): Promise<DatabaseHandle> {
  const client = new PGlite();
  await client.waitReady;
  const db = drizzlePglite(client, { schema }) as unknown as AppDatabase;

  return {
    db,
    kind: 'pglite',
    runner: {
      async exec(sqlText: string): Promise<void> {
        await client.exec(sqlText);
      },
      async query<T extends Record<string, unknown>>(sqlText: string): Promise<T[]> {
        const result = await client.query<T>(sqlText);
        return result.rows;
      },
    },
    async close(): Promise<void> {
      await client.close();
    },
  };
}
