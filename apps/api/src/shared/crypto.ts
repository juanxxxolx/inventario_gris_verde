import { hash, verify } from '@node-rs/argon2';
import type { UserRole } from '@induinventory/contracts';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env';

export interface PasswordHashOptions {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

export class PasswordHasher {
  private readonly options: PasswordHashOptions;
  private dummyHashPromise: Promise<string> | undefined;

  constructor(env: Env) {
    this.options = {
      memoryCost: env.ARGON2_MEMORY_KIB,
      timeCost: env.ARGON2_TIME_COST,
      parallelism: env.ARGON2_PARALLELISM,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      memoryCost: this.options.memoryCost,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism,
      outputLen: 32,
    });
  }

  async verifyPassword(hashed: string, password: string): Promise<boolean> {
    try {
      return await verify(hashed, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<void> {
    this.dummyHashPromise ??= this.hashPassword('dummy-password-for-timing-equalisation');
    const dummyHash = await this.dummyHashPromise;
    await this.verifyPassword(dummyHash, password);
  }
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
  role: UserRole;
  jti: string;
  issuedAt: number;
}

export interface SignedAccessToken {
  token: string;
  jti: string;
  expiresAt: Date;
}

export class TokenService {
  private readonly secret: Uint8Array;
  private readonly issuer = 'induinventory';
  private readonly audience = 'induinventory-web';

  constructor(
    private readonly ttlSeconds: number,
    secret: string,
  ) {
    this.secret = new TextEncoder().encode(secret);
  }

  async signAccessToken(input: {
    userId: string;
    sessionId: string;
    role: UserRole;
  }): Promise<SignedAccessToken> {
    const jti = randomUUID();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.ttlSeconds * 1000);

    const token = await new SignJWT({
      sid: input.sessionId,
      role: input.role,
      jti,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(input.userId)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.secret);

    return { token, jti, expiresAt };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
      issuer: this.issuer,
      audience: this.audience,
      clockTolerance: 5,
    });

    const userId = payload.sub;
    const sessionId = payload['sid'];
    const role = payload['role'];
    const jti = payload['jti'];
    const issuedAt = payload.iat;

    if (
      typeof userId !== 'string' ||
      typeof sessionId !== 'string' ||
      typeof role !== 'string' ||
      typeof jti !== 'string' ||
      typeof issuedAt !== 'number' ||
      !['ADMIN', 'OPERATOR', 'VIEWER'].includes(role)
    ) {
      throw new Error('Token con claims inválidos.');
    }

    return {
      userId,
      sessionId,
      role: role as UserRole,
      jti,
      issuedAt,
    };
  }
}

export function createTokenService(env: Env): TokenService {
  return new TokenService(env.ACCESS_TOKEN_TTL_SECONDS, env.JWT_SECRET);
}
