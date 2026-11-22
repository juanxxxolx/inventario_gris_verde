import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Package,
  Wrench,
} from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate } from '../lib/demo/format';
import { useDemo } from '../lib/demo/store';

export function DashboardPage() {
  const { machines, spareParts, requests, maintenance, activity } = useDemo();

  const operative = machines.filter((item) => item.status.tone === 'success').length;
  const attention = machines.filter((item) => item.status.tone === 'warning').length;
  const down = machines.filter((item) => item.status.tone === 'error').length;
  const lowStock = spareParts.filter(
    (item) => item.status.tone === 'warning' || item.status.tone === 'error',
  ).length;
  const pending = requests.filter((item) => item.status.tone === 'pending').length;

  const statusBars = [
    { label: 'Operativa', value: operative, className: '' },
    { label: 'Requiere atención', value: attention, className: 'chart-bar__fill--warning' },
    {
      label: 'En mantenimiento',
      value: machines.filter((item) => item.status.tone === 'info').length,
      className: 'chart-bar__fill--secondary',
    },
    { label: 'Fuera de servicio', value: down, className: 'chart-bar__fill--warning' },
  ];
  const maxBar = Math.max(...statusBars.map((item) => item.value), 1);

  const upcoming = maintenance
    .filter((item) => item.status.tone !== 'success')
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
    .slice(0, 4);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Vista general · GRIS VERDE"
        title="Dashboard general"
        subtitle="Panorama operativo de maquinaria, inventario, solicitudes y mantenimiento. Los valores corresponden a la maqueta."
        actions={
          <>
            <Link className="button button--secondary" to="/mantenimiento">
              <CalendarClock size={16} aria-hidden="true" />
              Ver mantenimiento
            </Link>
            <Link className="button button--primary" to="/solicitudes">
              <ClipboardList size={16} aria-hidden="true" />
              Ver solicitudes
            </Link>
          </>
        }
      />

      <Alert tone="info" title="Maqueta funcional, sin datos reales">
        La información de esta pantalla es ficticia y existe solo en memoria. La conexión con la API
        real se verifica abajo con <strong>/api/health</strong>; aún no hay endpoints de negocio.
      </Alert>

      <div className="metric-grid">
        <MetricCard
          label="Máquinas operativas"
          value={String(operative)}
          icon={<CheckCircle2 size={17} aria-hidden="true" />}
          foot={<span>de {machines.length} equipos registrados</span>}
        />
        <MetricCard
          label="Requieren atención"
          value={String(attention + down)}
          tone="warning"
          icon={<AlertTriangle size={17} aria-hidden="true" />}
          foot={<span>{down} fuera de servicio</span>}
        />
        <MetricCard
          label="Repuestos críticos"
          value={String(lowStock)}
          tone="error"
          icon={<Package size={17} aria-hidden="true" />}
          foot={<span>stock bajo o agotado</span>}
        />
        <MetricCard
          label="Solicitudes pendientes"
          value={String(pending)}
          tone="info"
          icon={<ClipboardList size={17} aria-hidden="true" />}
          foot={<span>de {requests.length} solicitudes</span>}
        />
      </div>

      <div className="split-grid">
        <div className="stack">
          <Card
            title="Estado de la maquinaria"
            meta="Distribución de equipos por estado visible"
            actions={
              <Link className="button button--ghost button--sm" to="/maquinaria">
                Ver detalle <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            }
          >
            <div className="chart-bars">
              {statusBars.map((bar) => (
                <div className="chart-bar" key={bar.label}>
                  <span className="chart-bar__label">{bar.label}</span>
                  <div
                    className="chart-bar__track"
                    role="img"
                    aria-label={`${bar.label}: ${bar.value} equipos`}
                  >
                    <div
                      className={`chart-bar__fill ${bar.className}`.trim()}
                      style={{ width: `${Math.round((bar.value / maxBar) * 100)}%` }}
                    />
                  </div>
                  <span className="chart-bar__value">{bar.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Actividad reciente" meta="Registros simulados de la sesión" flush>
            <ul className="activity-list">
              {activity.slice(0, 5).map((item) => (
                <li className="activity-item" key={item.id}>
                  <span className="activity-item__icon" aria-hidden="true">
                    {item.tone === 'error' || item.tone === 'warning' ? (
                      <AlertTriangle size={16} />
                    ) : item.tone === 'success' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Wrench size={16} />
                    )}
                  </span>
                  <div className="activity-item__body">
                    <p className="activity-item__title">{item.title}</p>
                    <p className="activity-item__meta">
                      {item.meta} · {item.time}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="stack">
          <Card
            title="Próximas atenciones"
            meta="Órdenes de mantenimiento visibles en la maqueta"
            actions={
              <Link className="button button--ghost button--sm" to="/mantenimiento">
                Todas <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            }
            flush
          >
            <ul className="activity-list">
              {upcoming.map((item) => (
                <li className="activity-item" key={item.id}>
                  <div className="activity-item__body">
                    <p className="activity-item__title">
                      {item.code} · {item.machine}
                    </p>
                    <p className="activity-item__meta">
                      {item.type} · {formatDate(item.scheduledFor)} · {item.assignedTo}
                    </p>
                    <div className="activity-item__status">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Puntos de atención" meta="Situaciones que requieren revisión">
            <div className="stack">
              <Alert tone="error" title={`${down} máquina(s) fuera de servicio`}>
                Revisar hojas de vida y orden correctiva correspondiente.
              </Alert>
              <Alert tone="warning" title={`${lowStock} repuesto(s) con stock crítico`}>
                Verificar existencias antes de programar nuevas entregas.
              </Alert>
              <Alert tone="info" title={`${pending} solicitud(es) pendientes`}>
                Las decisiones de aprobación no están implementadas en la maqueta.
              </Alert>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
