import { eq } from 'drizzle-orm';
import { loadEnv } from '../config/env';
import { createDatabase } from '../shared/db/client';
import { runMigrations } from '../shared/db/migrate';
import { users } from '../shared/db/schema';
import { PasswordHasher } from '../shared/crypto';
import { newId } from '../shared/ids';

async function main(): Promise<void> {
  const env = loadEnv();

  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    process.stderr.write(
      'Definí SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear el administrador inicial.\n',
    );
    process.exit(1);
  }

  const email = env.SEED_ADMIN_EMAIL.trim().toLowerCase();
  const hasher = new PasswordHasher(env);
  const db = await createDatabase(env);

  try {
    await runMigrations(db.runner);

    const [existing] = await db.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      process.stdout.write(`El administrador ${email} ya existe. No se realizaron cambios.\n`);
      return;
    }

    const passwordHash = await hasher.hashPassword(env.SEED_ADMIN_PASSWORD);

    await db.db.insert(users).values({
      id: newId(),
      fullName: env.SEED_ADMIN_NAME,
      email,
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    });

    process.stdout.write(`Administrador creado: ${email}\n`);
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `Error al crear el administrador: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
