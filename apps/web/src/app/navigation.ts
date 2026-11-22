import {
  BarChart3,
  ClipboardList,
  Crosshair,
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type NavigationGroup = 'Operación' | 'Administración';

interface NavigationItemDefinition {
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavigationGroup;
  description: string;
}

/** Fuente única de verdad para la navegación lateral y los títulos de ruta. */
export const NAVIGATION_ITEMS = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'Operación',
    description: 'Indicadores generales de la operación',
  },
  {
    to: '/maquinaria',
    label: 'Maquinaria y hojas de vida',
    icon: Wrench,
    group: 'Operación',
    description: 'Equipos, estado y hojas de vida',
  },
  {
    to: '/repuestos',
    label: 'Repuestos',
    icon: Package,
    group: 'Operación',
    description: 'Inventario de repuestos y existencias',
  },
  {
    to: '/solicitudes',
    label: 'Solicitudes y entregas',
    icon: ClipboardList,
    group: 'Operación',
    description: 'Solicitudes de materiales y entregas',
  },
  {
    to: '/agujas',
    label: 'Inventario de agujas',
    icon: Crosshair,
    group: 'Operación',
    description: 'Agujas por calibre, tipo y máquina',
  },
  {
    to: '/mantenimiento',
    label: 'Mantenimiento',
    icon: Wrench,
    group: 'Operación',
    description: 'Órdenes programadas y ejecución',
  },
  {
    to: '/costos',
    label: 'Costos y reportes',
    icon: BarChart3,
    group: 'Administración',
    description: 'Presupuesto, ejecución y reportes',
  },
  {
    to: '/usuarios',
    label: 'Usuarios y configuración',
    icon: Users,
    group: 'Administración',
    description: 'Cuentas, roles y preferencias',
  },
] as const satisfies readonly NavigationItemDefinition[];

export type NavigationPath = (typeof NAVIGATION_ITEMS)[number]['to'];

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = ['Operación', 'Administración'];

export function navigationLabel(path: string): string {
  if (path === '/perfil') {
    return 'Mi perfil';
  }
  return NAVIGATION_ITEMS.find((item) => item.to === path)?.label ?? 'InduInventory';
}
