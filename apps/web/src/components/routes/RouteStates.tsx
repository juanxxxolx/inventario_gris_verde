import { ErrorState } from '../ui/ErrorState';
import { LoadingState } from '../ui/LoadingState';

export function RouteErrorState() {
  return <ErrorState title="No se pudo cargar la página" />;
}

export function RoutePendingState() {
  return <LoadingState label="Cargando página…" />;
}
