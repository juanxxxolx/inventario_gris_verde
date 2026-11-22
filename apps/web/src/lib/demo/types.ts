/**
 * Tipos de la maqueta. No son contratos de la API: son estructuras flexibles
 * para visualizar los módulos hasta que se definan las reglas de negocio.
 */
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'neutral';

export interface DemoStatus {
  label: string;
  tone: StatusTone;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  serial: string;
  location: string;
  status: DemoStatus;
  hours: number;
  lastMaintenance: string;
  nextMaintenance: string;
  operator: string;
  notes: string;
}

export interface SparePart {
  id: string;
  code: string;
  name: string;
  category: string;
  compatibleMachine: string;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
  status: DemoStatus;
  lastMovement: string;
}

export interface SupplyRequest {
  id: string;
  code: string;
  item: string;
  quantity: number;
  unit: string;
  requester: string;
  machine: string;
  priority: 'Alta' | 'Media' | 'Baja';
  requestedAt: string;
  status: DemoStatus;
  notes: string;
}

export interface Needle {
  id: string;
  code: string;
  gauge: string;
  type: string;
  machine: string;
  quantity: number;
  location: string;
  supplier: string;
  status: DemoStatus;
  updatedAt: string;
}

export interface MaintenanceOrder {
  id: string;
  code: string;
  machine: string;
  type: 'Preventivo' | 'Correctivo' | 'Predictivo';
  scheduledFor: string;
  assignedTo: string;
  durationMinutes: number;
  priority: 'Alta' | 'Media' | 'Baja';
  status: DemoStatus;
  checklist: string[];
}

export interface CostEntry {
  id: string;
  code: string;
  period: string;
  concept: string;
  category: string;
  budget: number;
  actual: number;
  owner: string;
  status: DemoStatus;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Operador' | 'Supervisor' | 'Consulta';
  area: string;
  status: DemoStatus;
  lastAccess: string;
}

export interface DemoNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  tone: StatusTone;
  read: boolean;
}

export interface ActivityEntry {
  id: string;
  title: string;
  meta: string;
  time: string;
  tone: StatusTone;
}

export interface Toast {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info' | 'warning';
}

export type NewMachine = Omit<Machine, 'id'>;
export type NewSparePart = Omit<SparePart, 'id'>;
export type NewSupplyRequest = Omit<SupplyRequest, 'id'>;
export type NewNeedle = Omit<Needle, 'id'>;
export type NewMaintenanceOrder = Omit<MaintenanceOrder, 'id'>;
export type NewCostEntry = Omit<CostEntry, 'id'>;
export type NewDemoUser = Omit<DemoUser, 'id'>;

export interface DemoState {
  machines: Machine[];
  spareParts: SparePart[];
  requests: SupplyRequest[];
  needles: Needle[];
  maintenance: MaintenanceOrder[];
  costs: CostEntry[];
  users: DemoUser[];
  notifications: DemoNotification[];
  activity: ActivityEntry[];
  toasts: Toast[];
}

export type EntityCollectionKey = Exclude<keyof DemoState, 'notifications' | 'activity' | 'toasts'>;
export type Entity = { id: string };
