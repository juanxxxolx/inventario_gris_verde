import type { UserRole } from '@induinventory/contracts';
import {
  boolean,
  check,
  index,
  inet,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').$type<UserRole>().notNull().default('VIEWER'),
    isActive: boolean('is_active').notNull().default(true),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    passwordChangedAt: timestamp('password_changed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_lower_uq').on(sql`lower(${table.email})`),
    index('users_role_idx').on(table.role),
    index('users_active_idx')
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
    index('users_locked_idx')
      .on(table.lockedUntil)
      .where(sql`${table.lockedUntil} is not null`),
    check('users_full_name_len', sql`char_length(${table.fullName}) between 2 and 80`),
    check(
      'users_email_normalized',
      sql`${table.email} = lower(${table.email}) and char_length(${table.email}) <= 254`,
    ),
    check('users_password_is_argon2id', sql`${table.passwordHash} like '$argon2id$%'`),
    check('users_role_valid', sql`${table.role} in ('ADMIN', 'OPERATOR', 'VIEWER')`),
    check('users_failed_attempts_nonnegative', sql`${table.failedLoginAttempts} >= 0`),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedByTokenId: uuid('replaced_by_token_id').references(
      (): AnyPgColumn => refreshTokens.id,
      { onDelete: 'set null' },
    ),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_hash_uq').on(table.tokenHash),
    index('refresh_tokens_user_family_idx').on(table.userId, table.familyId),
    index('refresh_tokens_family_active_idx')
      .on(table.familyId)
      .where(sql`${table.revokedAt} is null`),
    index('refresh_tokens_expires_idx').on(table.expiresAt),
    check('refresh_tokens_hash_format', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('refresh_tokens_expiry', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'refresh_tokens_user_agent_len',
      sql`${table.userAgent} is null or char_length(${table.userAgent}) <= 512`,
    ),
  ],
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    requestedIp: inet('requested_ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('email_verification_hash_uq').on(table.tokenHash),
    uniqueIndex('email_verification_one_active_uq')
      .on(table.userId)
      .where(sql`${table.usedAt} is null and ${table.invalidatedAt} is null`),
    index('email_verification_expires_idx').on(table.expiresAt),
    check('email_verification_hash_format', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('email_verification_expiry', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'email_verification_ua_len',
      sql`${table.userAgent} is null or char_length(${table.userAgent}) <= 512`,
    ),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    requestedIp: inet('requested_ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('password_reset_hash_uq').on(table.tokenHash),
    uniqueIndex('password_reset_one_active_uq')
      .on(table.userId)
      .where(sql`${table.usedAt} is null and ${table.invalidatedAt} is null`),
    index('password_reset_expires_idx').on(table.expiresAt),
    check('password_reset_hash_format', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('password_reset_expiry', sql`${table.expiresAt} > ${table.createdAt}`),
    check(
      'password_reset_ua_len',
      sql`${table.userAgent} is null or char_length(${table.userAgent}) <= 512`,
    ),
  ],
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type RefreshTokenRecord = typeof refreshTokens.$inferSelect;
export type EmailVerificationTokenRecord = typeof emailVerificationTokens.$inferSelect;
export type PasswordResetTokenRecord = typeof passwordResetTokens.$inferSelect;

export const schema = {
  users,
  refreshTokens,
  emailVerificationTokens,
  passwordResetTokens,
};
