import { createContext, useContext } from 'react';
import type {
  ActivityEntry,
  CostEntry,
  DemoState,
  DemoStatus,
  DemoUser,
  Entity,
  EntityCollectionKey,
  Machine,
  MaintenanceOrder,
  Needle,
  NewCostEntry,
  NewDemoUser,
  NewMachine,
  NewMaintenanceOrder,
  NewNeedle,
  NewSparePart,
  NewSupplyRequest,
  SparePart,
  SupplyRequest,
  Toast,
} from './types';

export interface DemoContextValue extends DemoState {
  unreadNotifications: number;
  markAllNotificationsRead: () => void;
  saveMachine: (item: NewMachine | Machine) => void;
  removeMachine: (id: string) => void;
  setMachineStatus: (id: string, status: DemoStatus) => void;
  saveSparePart: (item: NewSparePart | SparePart) => void;
  removeSparePart: (id: string) => void;
  setSparePartStatus: (id: string, status: DemoStatus) => void;
  saveRequest: (item: NewSupplyRequest | SupplyRequest) => void;
  removeRequest: (id: string) => void;
  setRequestStatus: (id: string, status: DemoStatus) => void;
  saveNeedle: (item: NewNeedle | Needle) => void;
  removeNeedle: (id: string) => void;
  setNeedleStatus: (id: string, status: DemoStatus) => void;
  saveMaintenance: (item: NewMaintenanceOrder | MaintenanceOrder) => void;
  removeMaintenance: (id: string) => void;
  setMaintenanceStatus: (id: string, status: DemoStatus) => void;
  saveCost: (item: NewCostEntry | CostEntry) => void;
  saveUser: (item: NewDemoUser | DemoUser) => void;
  setUserStatus: (id: string, status: DemoStatus) => void;
  pushToast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
}

export const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function useDemo(): DemoContextValue {
  const context = useContext(DemoContext);

  if (!context) {
    throw new Error('useDemo debe usarse dentro de DemoProvider.');
  }

  return context;
}

let sequence = 0;

/** Identificador exclusivo de la sesión de maqueta (no persistente). */
export function createDemoId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export function upsert<K extends EntityCollectionKey>(
  state: DemoState,
  key: K,
  entity: DemoState[K][number],
): DemoState {
  const current = state[key] as Entity[];
  const next = [entity as Entity, ...current.filter((item) => item.id !== entity.id)];
  return { ...state, [key]: next } as DemoState;
}

export function remove(state: DemoState, key: EntityCollectionKey, id: string): DemoState {
  const current = state[key] as Entity[];
  return { ...state, [key]: current.filter((item) => item.id !== id) } as DemoState;
}

export function patchStatus(
  state: DemoState,
  key: EntityCollectionKey,
  id: string,
  status: DemoStatus,
): DemoState {
  const current = state[key] as Array<Entity & { status: DemoStatus }>;
  return {
    ...state,
    [key]: current.map((item) => (item.id === id ? { ...item, status } : item)),
  } as DemoState;
}

export function withActivity(state: DemoState, entry: Omit<ActivityEntry, 'id'>): DemoState {
  return {
    ...state,
    activity: [{ ...entry, id: createDemoId('ac') }, ...state.activity].slice(0, 30),
  };
}
