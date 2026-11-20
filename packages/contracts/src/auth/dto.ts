export const USER_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserDto {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: UserDto;
  csrfToken: string;
}

export interface RegisterResponse {
  user: UserDto;
  message: string;
}

export interface MessageResponse {
  message: string;
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  version: string;
  uptimeSeconds: number;
}
