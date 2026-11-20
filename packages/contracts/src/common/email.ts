import { z } from 'zod';

export const EMAIL_MAX_LENGTH = 254;

export const emailSchema = z
  .string({ error: 'El correo electrónico es obligatorio.' })
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, `El correo no puede superar los ${EMAIL_MAX_LENGTH} caracteres.`)
  .pipe(z.email('Ingresá un correo electrónico válido.'));

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
