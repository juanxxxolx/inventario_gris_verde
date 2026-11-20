import type { ErrorCode, FieldError } from '@induinventory/contracts';

export interface AppErrorOptions {
  code: ErrorCode;
  status: number;
  title: string;
  message: string;
  fieldErrors?: FieldError[];
  headers?: Record<string, string>;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly title: string;
  readonly fieldErrors: FieldError[];
  readonly headers: Record<string, string>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.status = options.status;
    this.title = options.title;
    this.fieldErrors = options.fieldErrors ?? [];
    this.headers = options.headers ?? {};
  }
}

export function validationError(fieldErrors: FieldError[]): AppError {
  return new AppError({
    code: 'VALIDATION_ERROR',
    status: 400,
    title: 'Error de validación',
    message: 'Revisá los campos marcados.',
    fieldErrors,
  });
}

export function invalidCredentials(): AppError {
  return new AppError({
    code: 'INVALID_CREDENTIALS',
    status: 401,
    title: 'Credenciales inválidas',
    message: 'El correo o la contraseña no son correctos.',
  });
}

export function unauthenticated(): AppError {
  return new AppError({
    code: 'UNAUTHENTICATED',
    status: 401,
    title: 'No autenticado',
    message: 'Necesitás iniciar sesión para continuar.',
  });
}

export function sessionExpired(): AppError {
  return new AppError({
    code: 'SESSION_EXPIRED',
    status: 401,
    title: 'Sesión vencida',
    message: 'Tu sesión venció. Iniciá sesión nuevamente.',
  });
}

export function sessionRevoked(): AppError {
  return new AppError({
    code: 'SESSION_REVOKED',
    status: 401,
    title: 'Sesión revocada',
    message: 'La sesión fue revocada. Iniciá sesión nuevamente.',
  });
}

export function emailNotVerified(): AppError {
  return new AppError({
    code: 'EMAIL_NOT_VERIFIED',
    status: 403,
    title: 'Correo sin verificar',
    message: 'Verificá tu correo electrónico antes de iniciar sesión.',
  });
}

export function accountDisabled(): AppError {
  return new AppError({
    code: 'ACCOUNT_DISABLED',
    status: 403,
    title: 'Cuenta deshabilitada',
    message: 'Tu cuenta está deshabilitada. Contactá a un administrador.',
  });
}

export function invalidOrExpiredToken(): AppError {
  return new AppError({
    code: 'INVALID_OR_EXPIRED_TOKEN',
    status: 400,
    title: 'Token inválido',
    message: 'El enlace es inválido o venció. Solicitá uno nuevo.',
  });
}

export function passwordReuse(): AppError {
  return new AppError({
    code: 'PASSWORD_REUSE',
    status: 400,
    title: 'Contraseña repetida',
    message: 'La nueva contraseña debe ser distinta de la actual.',
  });
}

export function csrfInvalid(): AppError {
  return new AppError({
    code: 'CSRF_INVALID',
    status: 403,
    title: 'Solicitud no válida',
    message: 'No pudimos validar la solicitud. Recargá la página e intentá de nuevo.',
  });
}

export function originNotAllowed(): AppError {
  return new AppError({
    code: 'ORIGIN_NOT_ALLOWED',
    status: 403,
    title: 'Origen no permitido',
    message: 'El origen de la solicitud no está permitido.',
  });
}

export function emailAlreadyExists(): AppError {
  return new AppError({
    code: 'EMAIL_ALREADY_EXISTS',
    status: 409,
    title: 'Correo ya registrado',
    message: 'Ya existe una cuenta con ese correo electrónico.',
    fieldErrors: [
      {
        field: 'email',
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Ya existe una cuenta con ese correo electrónico.',
      },
    ],
  });
}

export function rateLimited(retryAfterSeconds: number): AppError {
  return new AppError({
    code: 'RATE_LIMITED',
    status: 429,
    title: 'Demasiadas solicitudes',
    message: 'Hiciste demasiadas solicitudes. Esperá unos minutos e intentá de nuevo.',
    headers: { 'retry-after': String(Math.max(1, retryAfterSeconds)) },
  });
}

export function accountLocked(retryAfterSeconds: number): AppError {
  return new AppError({
    code: 'ACCOUNT_LOCKED',
    status: 429,
    title: 'Cuenta bloqueada temporalmente',
    message: 'Demasiados intentos fallidos. Esperá unos minutos e intentá de nuevo.',
    headers: { 'retry-after': String(Math.max(1, retryAfterSeconds)) },
  });
}

export function unsupportedMediaType(): AppError {
  return new AppError({
    code: 'UNSUPPORTED_MEDIA_TYPE',
    status: 415,
    title: 'Formato no soportado',
    message: 'El contenido debe enviarse como application/json.',
  });
}

export function payloadTooLarge(): AppError {
  return new AppError({
    code: 'PAYLOAD_TOO_LARGE',
    status: 413,
    title: 'Solicitud demasiado grande',
    message: 'El contenido enviado supera el tamaño permitido.',
  });
}

export function serviceUnavailable(): AppError {
  return new AppError({
    code: 'SERVICE_UNAVAILABLE',
    status: 503,
    title: 'Servicio no disponible',
    message: 'El servicio no está disponible en este momento. Intentá nuevamente.',
  });
}

export function internalError(): AppError {
  return new AppError({
    code: 'INTERNAL_ERROR',
    status: 500,
    title: 'Error interno',
    message: 'Ocurrió un error inesperado. Intentá nuevamente.',
  });
}

export function notFound(): AppError {
  return new AppError({
    code: 'NOT_FOUND',
    status: 404,
    title: 'Recurso no encontrado',
    message: 'La dirección solicitada no existe.',
  });
}
