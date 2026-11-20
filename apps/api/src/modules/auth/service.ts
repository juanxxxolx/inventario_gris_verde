import { eq } from 'drizzle-orm';
import type { Logger } from 'pino';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RegisterResponse,
  ResendVerificationInput,
  ResetPasswordInput,
  UserDto,
  VerifyEmailInput,
} from '@induinventory/contracts';
import type { Env } from '../../config/env';
import type { AppDatabase } from '../../shared/db/client';
import { refreshTokens, type UserRecord } from '../../shared/db/schema';
import {
  accountDisabled,
  accountLocked,
  emailAlreadyExists,
  emailNotVerified,
  invalidCredentials,
  invalidOrExpiredToken,
  passwordReuse,
  sessionExpired,
  sessionRevoked,
  unauthenticated,
} from '../../shared/errors';
import { generateCsrfToken, generateOpaqueToken, sha256Hex } from '../../shared/crypto';
import type { PasswordHasher, TokenService } from '../../shared/crypto';
import type { RateLimiter } from '../../shared/rate-limit';
import type { EmailMessage, EmailSender } from '../../shared/email';
import {
  renderPasswordChangedEmail,
  renderPasswordResetEmail,
  renderVerificationEmail,
} from '../../shared/email';
import { newId } from '../../shared/ids';
import {
  createRefreshToken,
  createResetToken,
  createVerificationToken,
  findFamilyActiveTokens,
  findResetTokenForUpdate,
  findRefreshTokenForUpdate,
  findUserByEmail,
  findUserById,
  findUserByIdForUpdate,
  findVerificationTokenForUpdate,
  insertUser,
  invalidateActiveResetTokens,
  invalidateActiveVerificationTokens,
  markResetTokenUsed,
  markVerificationTokenUsed,
  revokeAllUserRefreshTokens,
  revokeFamily,
  revokeRefreshToken,
  updateUser,
} from './repository';

const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const REGISTER_WINDOW_SECONDS = 60 * 60;
const REGISTER_MAX = 10;
const EMAIL_REQUEST_MAX = 5;
const REFRESH_WINDOW_SECONDS = 60;
const REFRESH_MAX = 60;

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface AuthServiceDeps {
  env: Env;
  db: AppDatabase;
  rateLimiter: RateLimiter;
  hasher: PasswordHasher;
  tokens: TokenService;
  email: EmailSender;
  logger: Logger;
  now?: () => Date;
}

export interface SessionResult {
  user: UserRecord;
  csrfToken: string;
  accessToken: string;
  refreshToken: string;
}

export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function normalizeIp(ip: string | undefined): string | null {
  if (!ip) {
    return null;
  }
  const withoutPrefix = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  return withoutPrefix.length > 0 ? withoutPrefix : null;
}

function safeUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent) {
    return null;
  }
  return userAgent.slice(0, 512);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

export class AuthService {
  private readonly now: () => Date;

  constructor(private readonly deps: AuthServiceDeps) {
    this.now = deps.now ?? (() => new Date());
  }

  private get env(): Env {
    return this.deps.env;
  }

  private get db(): AppDatabase {
    return this.deps.db;
  }

  async register(input: RegisterInput, context: RequestContext): Promise<RegisterResponse> {
    await this.deps.rateLimiter.consume(
      `rl:register:${context.ip ?? 'unknown'}`,
      REGISTER_MAX,
      REGISTER_WINDOW_SECONDS,
    );

    const existing = await findUserByEmail(this.db, input.email);
    if (existing) {
      throw emailAlreadyExists();
    }

    const passwordHash = await this.deps.hasher.hashPassword(input.password);
    const userId = newId();
    const verificationToken = generateOpaqueToken();
    const expiresAt = new Date(this.now().getTime() + this.env.EMAIL_TOKEN_TTL_SECONDS * 1000);

    let user: UserRecord;
    try {
      user = await this.db.transaction(async (tx) => {
        const created = await insertUser(tx, {
          id: userId,
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          role: 'VIEWER',
        });

        await invalidateActiveVerificationTokens(tx, created.id);
        await createVerificationToken(tx, {
          id: newId(),
          userId: created.id,
          tokenHash: sha256Hex(verificationToken),
          expiresAt,
          requestedIp: normalizeIp(context.ip),
          userAgent: safeUserAgent(context.userAgent),
        });

        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw emailAlreadyExists();
      }
      throw error;
    }

    await this.sendVerificationEmail(user, verificationToken);

    return {
      user: toUserDto(user),
      message: 'Te enviamos un correo para verificar tu cuenta.',
    };
  }

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const tokenHash = sha256Hex(input.token);

    const outcome = await this.db.transaction(async (tx) => {
      const record = await findVerificationTokenForUpdate(tx, tokenHash);
      if (!record || record.usedAt || record.invalidatedAt || record.expiresAt <= this.now()) {
        return 'invalid' as const;
      }

      const user = await findUserById(tx, record.userId);
      if (!user) {
        return 'invalid' as const;
      }

      await markVerificationTokenUsed(tx, record.id);
      await invalidateActiveVerificationTokens(tx, user.id);
      if (!user.emailVerifiedAt) {
        await updateUser(tx, user.id, { emailVerifiedAt: this.now() });
      }

      return 'ok' as const;
    });

    if (outcome === 'invalid') {
      throw invalidOrExpiredToken();
    }
  }

  async resendVerification(input: ResendVerificationInput, context: RequestContext): Promise<void> {
    await this.deps.rateLimiter.consume(
      `rl:verify-resend:${context.ip ?? 'unknown'}:${sha256Hex(input.email).slice(0, 16)}`,
      EMAIL_REQUEST_MAX,
      REGISTER_WINDOW_SECONDS,
    );

    const user = await findUserByEmail(this.db, input.email);
    if (!user || !user.isActive || user.emailVerifiedAt) {
      return;
    }

    const verificationToken = generateOpaqueToken();
    await this.db.transaction(async (tx) => {
      await invalidateActiveVerificationTokens(tx, user.id);
      await createVerificationToken(tx, {
        id: newId(),
        userId: user.id,
        tokenHash: sha256Hex(verificationToken),
        expiresAt: new Date(this.now().getTime() + this.env.EMAIL_TOKEN_TTL_SECONDS * 1000),
        requestedIp: normalizeIp(context.ip),
        userAgent: safeUserAgent(context.userAgent),
      });
    });

    await this.sendVerificationEmail(user, verificationToken);
  }

  async login(input: LoginInput, context: RequestContext): Promise<SessionResult> {
    const emailKey = sha256Hex(input.email).slice(0, 24);
    const failureKey = `rl:login:fail:${context.ip ?? 'unknown'}:${emailKey}`;
    const denyKey = `rl:login:deny:${context.ip ?? 'unknown'}:${emailKey}`;

    const denied = await this.deps.rateLimiter.get(denyKey);
    if (denied.count > 0) {
      throw accountLocked(denied.ttlSeconds > 0 ? denied.ttlSeconds : LOGIN_WINDOW_SECONDS);
    }

    const user = await findUserByEmail(this.db, input.email);

    if (!user) {
      await this.deps.hasher.verifyDummy(input.password);
      await this.registerFailure(failureKey, denyKey);
      throw invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil > this.now()) {
      const retryAfter = Math.ceil((user.lockedUntil.getTime() - this.now().getTime()) / 1000);
      throw accountLocked(Math.max(1, retryAfter));
    }

    if (!user.isActive) {
      throw accountDisabled();
    }

    const passwordMatches = await this.deps.hasher.verifyPassword(user.passwordHash, input.password);

    if (!passwordMatches) {
      await updateUser(this.db, user.id, {
        failedLoginAttempts: user.failedLoginAttempts + 1,
        lockedUntil:
          user.failedLoginAttempts + 1 >= LOGIN_MAX_FAILURES
            ? new Date(this.now().getTime() + LOGIN_WINDOW_SECONDS * 1000)
            : user.lockedUntil,
      });
      await this.registerFailure(failureKey, denyKey);
      throw invalidCredentials();
    }

    if (!user.emailVerifiedAt) {
      throw emailNotVerified();
    }

    await updateUser(this.db, user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: this.now(),
    });
    await Promise.all([
      this.deps.rateLimiter.reset(failureKey),
      this.deps.rateLimiter.reset(denyKey),
    ]);

    return this.issueSession(user, newId());
  }

  async rotateRefreshToken(
    rawToken: string | undefined,
    context: RequestContext,
  ): Promise<SessionResult> {
    await this.deps.rateLimiter.consume(
      `rl:refresh:${context.ip ?? 'unknown'}`,
      REFRESH_MAX,
      REFRESH_WINDOW_SECONDS,
    );

    if (!rawToken || !/^[A-Za-z0-9_-]{43}$/u.test(rawToken)) {
      throw sessionExpired();
    }

    const tokenHash = sha256Hex(rawToken);
    const now = this.now();

    const outcome = await this.db.transaction(async (tx) => {
      const record = await findRefreshTokenForUpdate(tx, tokenHash);

      if (!record) {
        return { type: 'unknown' } as const;
      }

      if (record.revokedAt) {
        await revokeFamily(tx, record.familyId);
        return { type: 'reuse' } as const;
      }

      if (record.expiresAt <= now) {
        await revokeRefreshToken(tx, record.id);
        return { type: 'expired' } as const;
      }

      const user = await findUserById(tx, record.userId);
      if (!user || !user.isActive) {
        await revokeFamily(tx, record.familyId);
        return { type: 'disabled' } as const;
      }

      const nextRawToken = generateOpaqueToken();
      const nextRecord = await createRefreshToken(tx, {
        id: newId(),
        userId: user.id,
        familyId: record.familyId,
        tokenHash: sha256Hex(nextRawToken),
        expiresAt: new Date(now.getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000),
        ipAddress: normalizeIp(context.ip),
        userAgent: safeUserAgent(context.userAgent),
      });

      await revokeRefreshToken(tx, record.id, nextRecord.id);

      return { type: 'ok', user, nextRawToken, familyId: record.familyId } as const;
    });

    if (outcome.type !== 'ok') {
      throw sessionRevoked();
    }

    const access = await this.deps.tokens.signAccessToken({
      userId: outcome.user.id,
      sessionId: outcome.familyId,
      role: outcome.user.role,
    });

    return {
      user: outcome.user,
      csrfToken: generateCsrfToken(),
      accessToken: access.token,
      refreshToken: outcome.nextRawToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken || !/^[A-Za-z0-9_-]{43}$/u.test(rawToken)) {
      return;
    }

    const tokenHash = sha256Hex(rawToken);
    const [record] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (record) {
      await revokeFamily(this.db, record.familyId);
    }
  }

  async currentUser(accessToken: string | undefined): Promise<UserRecord> {
    if (!accessToken) {
      throw unauthenticated();
    }

    let claims;
    try {
      claims = await this.deps.tokens.verifyAccessToken(accessToken);
    } catch {
      throw sessionExpired();
    }

    const user = await findUserById(this.db, claims.userId);
    if (!user) {
      throw sessionRevoked();
    }
    if (!user.isActive) {
      throw accountDisabled();
    }
    if (user.passwordChangedAt.getTime() > claims.issuedAt * 1000 + 1000) {
      throw sessionRevoked();
    }

    const activeTokens = await findFamilyActiveTokens(this.db, claims.sessionId);
    const hasLiveSession = activeTokens.some((token) => token.expiresAt > this.now());
    if (!hasLiveSession) {
      throw sessionRevoked();
    }

    return user;
  }

  async forgotPassword(input: ForgotPasswordInput, context: RequestContext): Promise<void> {
    await this.deps.rateLimiter.consume(
      `rl:forgot:${context.ip ?? 'unknown'}:${sha256Hex(input.email).slice(0, 16)}`,
      EMAIL_REQUEST_MAX,
      REGISTER_WINDOW_SECONDS,
    );

    const user = await findUserByEmail(this.db, input.email);
    if (!user || !user.isActive) {
      return;
    }

    const resetToken = generateOpaqueToken();
    await this.db.transaction(async (tx) => {
      await invalidateActiveResetTokens(tx, user.id);
      await createResetToken(tx, {
        id: newId(),
        userId: user.id,
        tokenHash: sha256Hex(resetToken),
        expiresAt: new Date(this.now().getTime() + this.env.RESET_TOKEN_TTL_SECONDS * 1000),
        requestedIp: normalizeIp(context.ip),
        userAgent: safeUserAgent(context.userAgent),
      });
    });

    const url = `${this.env.APP_PUBLIC_URL}/reset-password?token=${resetToken}`;
    const message = renderPasswordResetEmail(
      user.fullName,
      url,
      Math.round(this.env.RESET_TOKEN_TTL_SECONDS / 60),
    );
    await this.deliver({ ...message, to: user.email, token: resetToken });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = sha256Hex(input.token);

    const outcome = await this.db.transaction(async (tx) => {
      const record = await findResetTokenForUpdate(tx, tokenHash);
      if (!record || record.usedAt || record.invalidatedAt || record.expiresAt <= this.now()) {
        return { type: 'invalid' } as const;
      }

      const user = await findUserByIdForUpdate(tx, record.userId);
      if (!user || !user.isActive) {
        return { type: 'invalid' } as const;
      }

      const samePassword = await this.deps.hasher.verifyPassword(user.passwordHash, input.password);
      if (samePassword) {
        return { type: 'reuse', user } as const;
      }

      const passwordHash = await this.deps.hasher.hashPassword(input.password);

      await updateUser(tx, user.id, {
        passwordHash,
        passwordChangedAt: this.now(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      await markResetTokenUsed(tx, record.id);
      await invalidateActiveResetTokens(tx, user.id);
      await revokeAllUserRefreshTokens(tx, user.id);

      return { type: 'ok', user } as const;
    });

    if (outcome.type === 'invalid') {
      throw invalidOrExpiredToken();
    }
    if (outcome.type === 'reuse') {
      throw passwordReuse();
    }

    const message = renderPasswordChangedEmail(outcome.user.fullName);
    await this.deliver({ ...message, to: outcome.user.email });
  }

  private async registerFailure(failureKey: string, denyKey: string): Promise<void> {
    const count = await this.deps.rateLimiter.increment(failureKey, LOGIN_WINDOW_SECONDS);
    if (count >= LOGIN_MAX_FAILURES) {
      await this.deps.rateLimiter.deny(denyKey, LOGIN_WINDOW_SECONDS);
      throw accountLocked(LOGIN_WINDOW_SECONDS);
    }
  }

  private async issueSession(user: UserRecord, familyId: string): Promise<SessionResult> {
    const refreshToken = generateOpaqueToken();
    const csrfToken = generateCsrfToken();

    await createRefreshToken(this.db, {
      id: newId(),
      userId: user.id,
      familyId,
      tokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(this.now().getTime() + this.env.REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    const access = await this.deps.tokens.signAccessToken({
      userId: user.id,
      sessionId: familyId,
      role: user.role,
    });

    return {
      user,
      csrfToken,
      accessToken: access.token,
      refreshToken,
    };
  }

  private async sendVerificationEmail(user: UserRecord, token: string): Promise<void> {
    const url = `${this.env.APP_PUBLIC_URL}/verify-email?token=${token}`;
    const message = renderVerificationEmail(
      user.fullName,
      url,
      Math.round(this.env.EMAIL_TOKEN_TTL_SECONDS / 3600),
    );
    await this.deliver({ ...message, to: user.email, token });
  }

  private async deliver(message: EmailMessage): Promise<void> {
    try {
      await this.deps.email.send(message);
    } catch (error) {
      this.deps.logger.error(
        { err: error, kind: message.kind },
        'No se pudo enviar el correo transaccional.',
      );
    }
  }
}
