import 'dotenv/config';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional(),
);

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    HOST: z.string().min(1).default('127.0.0.1'),
    APP_ORIGIN: z.url().default('http://localhost:5173'),
    APP_PUBLIC_URL: z.url().default('http://localhost:5173'),
    DATABASE_URL: optionalString,
    PGLITE_DATA_DIR: z.string().default('./.data/pglite'),
    REDIS_URL: optionalString,
    JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres.'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3600).max(2_592_000).default(604_800),
    EMAIL_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(604_800).default(86_400),
    RESET_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(86_400).default(3_600),
    COOKIE_SECURE: booleanString.default(true),
    TRUST_PROXY: booleanString.default(false),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    ARGON2_MEMORY_KIB: z.coerce.number().int().min(8192).max(1_048_576).default(19_456),
    ARGON2_TIME_COST: z.coerce.number().int().min(2).max(10).default(2),
    ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(8).default(1),
    SMTP_HOST: optionalString,
    SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    SMTP_SECURE: booleanString.default(false),
    SMTP_USER: optionalString,
    SMTP_PASSWORD: optionalString,
    EMAIL_FROM: z.string().min(3).default('InduInventory <no-reply@induinventory.local>'),
    ENABLE_TEST_ENDPOINTS: booleanString.default(false),
    AUTO_MIGRATE: booleanString.default(false),
    SEED_ADMIN_NAME: z.string().default('Administrador'),
    SEED_ADMIN_EMAIL: optionalString,
    SEED_ADMIN_PASSWORD: optionalString,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.DATABASE_URL) {
        ctx.addIssue({
          code: 'custom',
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL es obligatoria en producción.',
        });
      }
      if (!env.REDIS_URL) {
        ctx.addIssue({
          code: 'custom',
          path: ['REDIS_URL'],
          message: 'REDIS_URL es obligatoria en producción.',
        });
      }
      if (!env.SMTP_HOST) {
        ctx.addIssue({
          code: 'custom',
          path: ['SMTP_HOST'],
          message: 'SMTP_HOST es obligatorio en producción.',
        });
      }
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE debe ser true en producción.',
        });
      }
      if (env.ENABLE_TEST_ENDPOINTS) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENABLE_TEST_ENDPOINTS'],
          message: 'Los endpoints de prueba no pueden habilitarse en producción.',
        });
      }
      if (!env.APP_ORIGIN.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: ['APP_ORIGIN'],
          message: 'APP_ORIGIN debe usar HTTPS en producción.',
        });
      }
      if (!env.APP_PUBLIC_URL.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: ['APP_PUBLIC_URL'],
          message: 'APP_PUBLIC_URL debe usar HTTPS en producción.',
        });
      }
    }

    if (env.SMTP_USER && !env.SMTP_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_PASSWORD'],
        message: 'SMTP_PASSWORD es obligatoria si SMTP_USER está definida.',
      });
    }

    if (!env.SMTP_USER && env.SMTP_PASSWORD) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP_USER es obligatoria si SMTP_PASSWORD está definida.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    process.stderr.write(`Configuración de entorno inválida:\n${details}\n`);
    process.exit(1);
  }

  cached = parsed.data;
  return cached;
}

function stringifyBooleanValues(
  values: Partial<Record<keyof Env, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      typeof value === 'boolean' ? String(value) : value,
    ]),
  );
}

export function createTestEnv(overrides: Partial<Record<keyof Env, unknown>> = {}): Env {
  const base = {
    NODE_ENV: 'test',
    PORT: 3000,
    HOST: '127.0.0.1',
    APP_ORIGIN: 'http://localhost:5173',
    APP_PUBLIC_URL: 'http://localhost:5173',
    DATABASE_URL: undefined,
    PGLITE_DATA_DIR: './.data/test-pglite',
    REDIS_URL: undefined,
    JWT_SECRET: 'test-secret-with-at-least-thirty-two-characters',
    ACCESS_TOKEN_TTL_SECONDS: 900,
    REFRESH_TOKEN_TTL_SECONDS: 604_800,
    EMAIL_TOKEN_TTL_SECONDS: 86_400,
    RESET_TOKEN_TTL_SECONDS: 3_600,
    COOKIE_SECURE: true,
    TRUST_PROXY: false,
    LOG_LEVEL: 'silent',
    ARGON2_MEMORY_KIB: 8192,
    ARGON2_TIME_COST: 2,
    ARGON2_PARALLELISM: 1,
    SMTP_HOST: undefined,
    SMTP_PORT: 587,
    SMTP_SECURE: false,
    SMTP_USER: undefined,
    SMTP_PASSWORD: undefined,
    EMAIL_FROM: 'InduInventory <no-reply@induinventory.local>',
    ENABLE_TEST_ENDPOINTS: true,
    AUTO_MIGRATE: false,
    SEED_ADMIN_NAME: 'Administrador',
    SEED_ADMIN_EMAIL: undefined,
    SEED_ADMIN_PASSWORD: undefined,
    ...overrides,
  };

  return envSchema.parse(stringifyBooleanValues(base));
}
