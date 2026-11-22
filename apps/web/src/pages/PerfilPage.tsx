import { Link } from '@tanstack/react-router';
import { CircleHelp, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useDemo } from '../lib/demo/store';

export function PerfilPage() {
  const { users, pushToast } = useDemo();
  const currentUser = users[0];
  const [preferences, setPreferences] = useState({ notificaciones: true, compacto: false });

  const initials = (currentUser?.name ?? 'Usuario')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administración · Cuenta"
        title="Mi perfil"
        subtitle="Datos de la cuenta simulada y preferencias visuales. No se muestra ni se solicita ninguna contraseña."
        actions={
          <Link className="button button--secondary" to="/usuarios">
            <Settings2 size={16} aria-hidden="true" />
            Ir a usuarios
          </Link>
        }
      />

      <Alert tone="info" title="Perfil de la maqueta">
        Los datos son ficticios y no se sincronizan con un sistema de identidad real. El inicio de
        sesión permanece en el backend y solo expone los endpoints de autenticación ya existentes.
      </Alert>

      <div className="split-grid">
        <Card title="Datos de la cuenta" meta="Registro simulado usado por la barra superior">
          <div className="stack">
            <div className="user-chip" aria-label="Usuario actual">
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="user-chip__copy">
                <span className="user-chip__name">{currentUser?.name ?? 'Usuario'}</span>
                <span className="user-chip__role">{currentUser?.email ?? ''}</span>
              </span>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-item__label">Rol</span>
                <span className="detail-item__value">{currentUser?.role ?? 'Consulta'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Área</span>
                <span className="detail-item__value">{currentUser?.area ?? 'No definida'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Último acceso</span>
                <span className="detail-item__value">
                  {currentUser?.lastAccess ?? 'Sin registro'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Estado</span>
                <span className="detail-item__value">
                  {currentUser ? <StatusBadge status={currentUser.status} /> : 'Sin datos'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="stack">
          <Card title="Preferencias visuales" meta="Solo demostración">
            <div className="stack">
              <label className="user-chip" htmlFor="profile-notifications">
                <input
                  id="profile-notifications"
                  type="checkbox"
                  checked={preferences.notificaciones}
                  onChange={(event) => {
                    setPreferences((prev) => ({ ...prev, notificaciones: event.target.checked }));
                    pushToast('Preferencia actualizada solo en la maqueta.', 'info');
                  }}
                />
                Mostrar notificaciones visuales
              </label>
              <label className="user-chip" htmlFor="profile-compact">
                <input
                  id="profile-compact"
                  type="checkbox"
                  checked={preferences.compacto}
                  onChange={(event) => {
                    setPreferences((prev) => ({ ...prev, compacto: event.target.checked }));
                    pushToast('Preferencia actualizada solo en la maqueta.', 'info');
                  }}
                />
                Vista compacta (pendiente de diseño)
              </label>
            </div>
          </Card>

          <Card title="Seguridad" meta="Preparado para integración futura">
            <div className="stack">
              <Alert tone="info" title="Autenticación real en el servidor">
                La maqueta no almacena credenciales ni secretos. Los permisos deben validarse
                siempre en el backend.
              </Alert>
              <Link className="button button--ghost" to="/usuarios">
                <CircleHelp size={15} aria-hidden="true" />
                Ver roles y accesos
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
