import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../config/env';

export type EmailKind = 'verify-email' | 'reset-password' | 'password-changed';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: EmailKind;
  token?: string;
  createdAt: Date;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class MemoryEmailSender implements EmailSender {
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<void> {
    this.messages.push(message);
  }

  latestFor(email: string): EmailMessage | undefined {
    const normalized = email.trim().toLowerCase();
    return [...this.messages].reverse().find((message) => message.to === normalized);
  }
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(env: Env) {
    this.from = env.EMAIL_FROM;
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASSWORD
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

export interface EmailHandle {
  sender: EmailSender;
  kind: 'smtp' | 'memory';
  memory?: MemoryEmailSender;
}

export function createEmailSender(env: Env): EmailHandle {
  if (env.SMTP_HOST) {
    return { sender: new SmtpEmailSender(env), kind: 'smtp' };
  }

  const memory = new MemoryEmailSender();
  return { sender: memory, kind: 'memory', memory };
}

function escapeHtml(value: string): string {
  let escaped = '';
  for (const character of value) {
    switch (character) {
      case '&':
        escaped += '&amp;';
        break;
      case '<':
        escaped += '&lt;';
        break;
      case '>':
        escaped += '&gt;';
        break;
      case '"':
        escaped += '&quot;';
        break;
      case "'":
        escaped += '&#39;';
        break;
      default:
        escaped += character;
    }
  }
  return escaped;
}

function layout(input: { title: string; body: string; footer: string }): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#F7F8F7;font-family:Inter,Arial,sans-serif;color:#1F2A24;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E6E3;border-radius:10px;">
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          <div style="font-size:20px;font-weight:600;color:#1E3D30;letter-spacing:-0.02em;">InduInventory</div>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0 32px;">
          <h1 style="margin:16px 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:#1F2A24;">${input.title}</h1>
          ${input.body}
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 28px 32px;border-top:1px solid #E2E6E3;color:#6B7A6E;font-size:12px;line-height:1.6;">
          ${input.footer}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderVerificationEmail(
  fullName: string,
  verificationUrl: string,
  ttlHours: number,
): EmailMessage {
  const safeName = escapeHtml(fullName);
  const safeUrl = escapeHtml(verificationUrl);
  const html = layout({
    title: 'Verificá tu correo',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#1F2A24;">Hola ${safeName},</p>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#1F2A24;">Para activar tu cuenta en InduInventory, confirmá tu correo electrónico.</p>
      <p style="margin:0 0 24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:#2F6B4F;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px;">Verificar correo</a>
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6B7A6E;">El enlace vence en ${ttlHours} horas y solo puede usarse una vez.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7A6E;">Si no creaste esta cuenta, ignorá este mensaje.</p>`,
    footer:
      'Por seguridad, no compartas este enlace con nadie. InduInventory nunca te pedirá tu contraseña por correo.',
  });

  return {
    to: '',
    subject: 'Verificá tu correo · InduInventory',
    html,
    text: `Hola ${fullName},\n\nVerificá tu correo para activar tu cuenta: ${verificationUrl}\n\nEl enlace vence en ${ttlHours} horas. Si no creaste esta cuenta, ignorá este mensaje.`,
    kind: 'verify-email',
    createdAt: new Date(),
  };
}

export function renderPasswordResetEmail(
  fullName: string,
  resetUrl: string,
  ttlMinutes: number,
): EmailMessage {
  const safeName = escapeHtml(fullName);
  const safeUrl = escapeHtml(resetUrl);
  const html = layout({
    title: 'Restablecé tu contraseña',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#1F2A24;">Hola ${safeName},</p>
      <p style="margin:0 0 24px 0;font-size:15px;line-height:1.7;color:#1F2A24;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p style="margin:0 0 24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:#2F6B4F;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px;">Crear nueva contraseña</a>
      </p>
      <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#6B7A6E;">El enlace vence en ${ttlMinutes} minutos y solo puede usarse una vez.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7A6E;">Si no solicitaste el cambio, ignorá este mensaje: tu contraseña actual sigue vigente.</p>`,
    footer:
      'Por seguridad, no compartas este enlace con nadie. InduInventory nunca te pedirá tu contraseña por correo.',
  });

  return {
    to: '',
    subject: 'Restablecé tu contraseña · InduInventory',
    html,
    text: `Hola ${fullName},\n\nRestablecé tu contraseña desde este enlace: ${resetUrl}\n\nEl enlace vence en ${ttlMinutes} minutos. Si no solicitaste el cambio, ignorá este mensaje.`,
    kind: 'reset-password',
    createdAt: new Date(),
  };
}

export function renderPasswordChangedEmail(fullName: string): EmailMessage {
  const safeName = escapeHtml(fullName);
  const html = layout({
    title: 'Tu contraseña cambió',
    body: `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#1F2A24;">Hola ${safeName},</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#1F2A24;">La contraseña de tu cuenta se actualizó correctamente y cerramos todas las sesiones activas.</p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#1F2A24;">Si no realizaste este cambio, contactá de inmediato a un administrador.</p>`,
    footer: 'Este es un aviso automático de seguridad de InduInventory.',
  });

  return {
    to: '',
    subject: 'Tu contraseña cambió · InduInventory',
    html,
    text: `Hola ${fullName},\n\nLa contraseña de tu cuenta se actualizó correctamente y cerramos todas las sesiones activas. Si no realizaste este cambio, contactá a un administrador.`,
    kind: 'password-changed',
    createdAt: new Date(),
  };
}
