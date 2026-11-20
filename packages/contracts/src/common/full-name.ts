import { z } from 'zod';

export const FULL_NAME_MIN_LENGTH = 2;
export const FULL_NAME_MAX_LENGTH = 80;

const FULL_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;

export const fullNameSchema = z
  .string({ error: 'El nombre completo es obligatorio.' })
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(FULL_NAME_MIN_LENGTH, `El nombre debe tener al menos ${FULL_NAME_MIN_LENGTH} caracteres.`)
      .max(FULL_NAME_MAX_LENGTH, `El nombre no puede superar los ${FULL_NAME_MAX_LENGTH} caracteres.`)
      .regex(
        FULL_NAME_PATTERN,
        'El nombre solo puede contener letras, espacios, apóstrofes y guiones.',
      ),
  );
