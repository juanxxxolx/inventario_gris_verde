import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAX_LENGTH,
  emailSchema,
  normalizeEmail,
  passwordSchema,
  registerSchema,
} from '../src/index';

describe('emailSchema', () => {
  it('normaliza mayúsculas y espacios surrounding', () => {
    expect(emailSchema.parse('  Usuario@Example.COM  ')).toBe('usuario@example.com');
    expect(normalizeEmail(' Usuario@Example.COM ')).toBe('usuario@example.com');
  });

  it('rechaza correos que superan EMAIL_MAX_LENGTH', () => {
    const local = 'a'.repeat(EMAIL_MAX_LENGTH);
    expect(emailSchema.safeParse(`${local}@example.com`).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('acepta una contraseña que cumple los cinco criterios', () => {
    expect(passwordSchema.safeParse('Abcdef1!ghij').success).toBe(true);
  });

  it('rechaza una contraseña sin número ni carácter especial', () => {
    expect(passwordSchema.safeParse('Abcdefghij').success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('rechaza campos desconocidos por ser strictObject', () => {
    const result = registerSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'Abcdef1!ghij',
      confirmPassword: 'Abcdef1!ghij',
      role: 'ADMIN',
    });

    expect(result.success).toBe(false);
  });

  it('rechaza contraseñas que no coinciden', () => {
    const result = registerSchema.safeParse({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'Abcdef1!ghij',
      confirmPassword: 'Abcdef1!ghik',
    });

    expect(result.success).toBe(false);
  });
});
