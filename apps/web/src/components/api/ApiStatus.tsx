import { useHealth } from '../../hooks/useHealth';
import { ErrorState } from '../ui/ErrorState';
import { LoadingState } from '../ui/LoadingState';

export function ApiStatus() {
  const health = useHealth();

  if (health.isPending) {
    return <LoadingState label="Verificando API…" />;
  }

  if (health.isError || !health.data) {
    return (
      <ErrorState
        title="API no disponible"
        message="No se pudo consultar /api/health."
        onRetry={() => {
          void health.refetch();
        }}
      />
    );
  }

  if (health.data.status !== 'ok') {
    return (
      <ErrorState
        title="API degradada"
        message={`Base de datos: ${health.data.checks.database} · Redis: ${health.data.checks.redis}`}
        onRetry={() => {
          void health.refetch();
        }}
      />
    );
  }

  return (
    <span className="status status--ok" role="status">
      API conectada · v{health.data.version}
    </span>
  );
}
