import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DbExecutor } from '../../shared/db/client';
import {
  emailVerificationTokens,
  passwordResetTokens,
  refreshTokens,
  users,
  type EmailVerificationTokenRecord,
  type PasswordResetTokenRecord,
  type RefreshTokenRecord,
  type UserRecord,
} from '../../shared/db/schema';

export async function findUserByEmail(
  db: DbExecutor,
  normalizedEmail: string,
): Promise<UserRecord | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);
  return user;
}

export async function findUserById(
  db: DbExecutor,
  userId: string,
): Promise<UserRecord | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user;
}

export async function findUserByIdForUpdate(
  db: DbExecutor,
  userId: string,
): Promise<UserRecord | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .for('update');
  return user;
}

export async function findUserByEmailForUpdate(
  db: DbExecutor,
  normalizedEmail: string,
): Promise<UserRecord | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1)
    .for('update');
  return user;
}

export async function insertUser(
  db: DbExecutor,
  values: typeof users.$inferInsert,
): Promise<UserRecord> {
  const [user] = await db.insert(users).values(values).returning();
  if (!user) {
    throw new Error('No se pudo crear el usuario.');
  }
  return user;
}

export async function updateUser(
  db: DbExecutor,
  userId: string,
  values: Partial<typeof users.$inferInsert>,
): Promise<UserRecord> {
  const [user] = await db.update(users).set(values).where(eq(users.id, userId)).returning();
  if (!user) {
    throw new Error('No se pudo actualizar el usuario.');
  }
  return user;
}

export async function createRefreshToken(
  db: DbExecutor,
  values: typeof refreshTokens.$inferInsert,
): Promise<RefreshTokenRecord> {
  const [token] = await db.insert(refreshTokens).values(values).returning();
  if (!token) {
    throw new Error('No se pudo crear el token de refresco.');
  }
  return token;
}

export async function findRefreshTokenByHashForUpdate(
  db: DbExecutor,
  tokenHash: string,
): Promise<RefreshTokenRecord | undefined> {
  const [token] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1)
    .for('update');
  return token;
}

export async function findFamilyActiveTokens(
  db: DbExecutor,
  familyId: string,
): Promise<RefreshTokenRecord[]> {
  return db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
}

export async function revokeRefreshToken(
  db: DbExecutor,
  tokenId: string,
  replacedByTokenId?: string,
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({
      revokedAt: new Date(),
      ...(replacedByTokenId ? { replacedByTokenId } : {}),
    })
    .where(eq(refreshTokens.id, tokenId));
}

export async function revokeFamily(db: DbExecutor, familyId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
}

export async function revokeAllUserRefreshTokens(
  db: DbExecutor,
  userId: string,
): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export async function invalidateActiveVerificationTokens(
  db: DbExecutor,
  userId: string,
): Promise<void> {
  await db
    .update(emailVerificationTokens)
    .set({ invalidatedAt: new Date() })
    .where(
      and(
        eq(emailVerificationTokens.userId, userId),
        isNull(emailVerificationTokens.usedAt),
        isNull(emailVerificationTokens.invalidatedAt),
      ),
    );
}

export async function createVerificationToken(
  db: DbExecutor,
  values: typeof emailVerificationTokens.$inferInsert,
): Promise<EmailVerificationTokenRecord> {
  const [token] = await db.insert(emailVerificationTokens).values(values).returning();
  if (!token) {
    throw new Error('No se pudo crear el token de verificación.');
  }
  return token;
}

export async function findVerificationTokenForUpdate(
  db: DbExecutor,
  tokenHash: string,
): Promise<EmailVerificationTokenRecord | undefined> {
  const [token] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1)
    .for('update');
  return token;
}

export async function markVerificationTokenUsed(
  db: DbExecutor,
  tokenId: string,
): Promise<void> {
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, tokenId));
}

export async function invalidateActiveResetTokens(
  db: DbExecutor,
  userId: string,
): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ invalidatedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
        isNull(passwordResetTokens.invalidatedAt),
      ),
    );
}

export async function createResetToken(
  db: DbExecutor,
  values: typeof passwordResetTokens.$inferInsert,
): Promise<PasswordResetTokenRecord> {
  const [token] = await db.insert(passwordResetTokens).values(values).returning();
  if (!token) {
    throw new Error('No se pudo crear el token de recuperación.');
  }
  return token;
}

export async function findResetTokenForUpdate(
  db: DbExecutor,
  tokenHash: string,
): Promise<PasswordResetTokenRecord | undefined> {
  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1)
    .for('update');
  return token;
}

export async function findResetTokenByHash(
  db: DbExecutor,
  tokenHash: string,
): Promise<PasswordResetTokenRecord | undefined> {
  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);
  return token;
}

export async function markResetTokenUsed(db: DbExecutor, tokenId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}
