import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MAX_BYTES = 512;

const hasUppercase = /\p{Lu}/u;
const hasLowercase = /\p{Ll}/u;
const hasDigit = /\p{Nd}/u;
const hasSpecial = /[\p{P}\p{S}]/u;
const hasControl = /[\p{Cc}\p{Cf}]/u;

export interface PasswordCriterion {
  id: 'length' | 'uppercase' | 'lowercase' | 'digit' | 'special';
  label: string;
  met: boolean;
}

export interface PasswordAssessment {
  criteria: PasswordCriterion[];
  metCount: number;
  strength: 'empty' | 'weak' | 'medium' | 'strong';
}

export function assessPassword(value: string): PasswordAssessment {
  const codePoints = [...value];
  const criteria: PasswordCriterion[] = [
    {
      id: 'length',
      label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      met: codePoints.length >= PASSWORD_MIN_LENGTH && codePoints.length <= PASSWORD_MAX_LENGTH,
    },
    { id: 'uppercase', label: 'Una letra mayúscula', met: hasUppercase.test(value) },
    { id: 'lowercase', label: 'Una letra minúscula', met: hasLowercase.test(value) },
    { id: 'digit', label: 'Un número', met: hasDigit.test(value) },
    { id: 'special', label: 'Un carácter especial', met: hasSpecial.test(value) },
  ];
  const metCount = criteria.filter((criterion) => criterion.met).length;
  const strength =
    value.length === 0
      ? 'empty'
      : metCount === criteria.length
        ? 'strong'
        : metCount >= 3
          ? 'medium'
          : 'weak';

  return { criteria, metCount, strength };
}

export const passwordSchema = z
  .string({ error: 'La contraseña es obligatoria.' })
  .superRefine((value, ctx) => {
    const codePoints = [...value];

    if (codePoints.length < PASSWORD_MIN_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      });
    }

    if (codePoints.length > PASSWORD_MAX_LENGTH) {
      ctx.addIssue({
        code: 'custom',
        message: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
      });
    }

    if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message: 'La contraseña es demasiado larga.',
      });
    }

    if (!hasUppercase.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'La contraseña debe incluir una mayúscula.' });
    }

    if (!hasLowercase.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'La contraseña debe incluir una minúscula.' });
    }

    if (!hasDigit.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'La contraseña debe incluir un número.' });
    }

    if (!hasSpecial.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'La contraseña debe incluir un carácter especial.' });
    }

    if (hasControl.test(value)) {
      ctx.addIssue({ code: 'custom', message: 'La contraseña contiene caracteres no permitidos.' });
    }

    if (value.trim() !== value) {
      ctx.addIssue({
        code: 'custom',
        message: 'La contraseña no puede empezar ni terminar con espacios.',
      });
    }
  });

export const loginPasswordSchema = z
  .string({ error: 'La contraseña es obligatoria.' })
  .min(1, 'La contraseña es obligatoria.')
  .max(PASSWORD_MAX_LENGTH, 'La contraseña es demasiado larga.')
  .refine((value) => !hasControl.test(value), 'La contraseña contiene caracteres no permitidos.');
