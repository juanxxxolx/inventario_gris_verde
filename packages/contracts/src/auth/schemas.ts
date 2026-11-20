import { z } from 'zod';
import { emailSchema } from '../common/email';
import { fullNameSchema } from '../common/full-name';
import { loginPasswordSchema, passwordSchema } from '../common/password';

export const opaqueTokenSchema = z
  .string({ error: 'El token es obligatorio.' })
  .regex(/^[A-Za-z0-9_-]{43}$/u, 'El token no es válido.');

export const registerSchema = z
  .strictObject({
    fullName: fullNameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: 'Confirmá la contraseña.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const verifyEmailSchema = z.strictObject({
  token: opaqueTokenSchema,
});

export const resendVerificationSchema = z.strictObject({
  email: emailSchema,
});

export const forgotPasswordSchema = z.strictObject({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .strictObject({
    token: opaqueTokenSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: 'Confirmá la contraseña.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
