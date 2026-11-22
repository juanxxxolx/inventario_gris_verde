import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router';
import { RootLayout } from '../components/layout/RootLayout';
import { RouteErrorState, RoutePendingState } from '../components/routes/RouteStates';
import { AgujasPage } from '../pages/AgujasPage';
import { CostosPage } from '../pages/CostosPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MaquinariaPage } from '../pages/MaquinariaPage';
import { MantenimientoPage } from '../pages/MantenimientoPage';
import { PerfilPage } from '../pages/PerfilPage';
import { RepuestosPage } from '../pages/RepuestosPage';
import { SolicitudesPage } from '../pages/SolicitudesPage';
import { UsuariosPage } from '../pages/UsuariosPage';
import { queryClient } from './query-client';

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: RouteErrorState,
  pendingComponent: RoutePendingState,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const maquinariaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/maquinaria',
  component: MaquinariaPage,
});

const repuestosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repuestos',
  component: RepuestosPage,
});

const solicitudesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solicitudes',
  component: SolicitudesPage,
});

const agujasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/agujas',
  component: AgujasPage,
});

const mantenimientoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mantenimiento',
  component: MantenimientoPage,
});

const costosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/costos',
  component: CostosPage,
});

const usuariosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/usuarios',
  component: UsuariosPage,
});

const perfilRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/perfil',
  component: PerfilPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  maquinariaRoute,
  repuestosRoute,
  solicitudesRoute,
  agujasRoute,
  mantenimientoRoute,
  costosRoute,
  usuariosRoute,
  perfilRoute,
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
