import type { z } from 'zod';
import type { FieldError } from '@induinventory/contracts';
import { validationError } from './errors';

const FIELD_LABELS: Record<string, string> = {
  fullName: 'nombre completo',
  email: 'correo electrónico',
  password: 'contraseña',
  confirmPassword: 'confirmación de contraseña',
  token: 'token',
};

function labelFor(path: string): string {
  return FIELD_LABELS[path] ?? path;
}

export function zodToFieldErrors(error: z.ZodError): FieldError[] {
  const fieldErrors: FieldError[] = [];

  for (const issue of error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        fieldErrors.push({
          field: key,
          code: 'UNKNOWN_FIELD',
          message: `El campo "${key}" no está permitido.`,
        });
      }
      continue;
    }

    const field = issue.path.length > 0 ? issue.path.join('.') : 'body';
    fieldErrors.push({
      field,
      code: 'INVALID_VALUE',
      message: issue.message,
    });
  }

  return fieldErrors;
}

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw validationError(zodToFieldErrors(result.error));
  }

  return result.data;
}

export function describeFields(fieldErrors: FieldError[]): string {
  const unique = [...new Set(fieldErrors.map((error) => labelFor(error.field)))];
  if (unique.length === 0) {
    return 'Revisá los datos ingresados.';
  }
  return `Revisá: ${unique.join(', ')}.`;
}
