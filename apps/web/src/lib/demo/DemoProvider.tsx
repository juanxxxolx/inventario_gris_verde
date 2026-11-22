import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import { createInitialDemoState } from './data';
import {
  createDemoId,
  DemoContext,
  patchStatus,
  remove,
  upsert,
  withActivity,
  type DemoContextValue,
} from './store';
import type {
  CostEntry,
  DemoStatus,
  DemoUser,
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

function isPersisted<T extends { id: string }>(item: T | Omit<T, 'id'>): item is T {
  return 'id' in item && typeof item.id === 'string';
}

/**
 * Proveedor de la maqueta. Todas las operaciones son SIMULADAS y viven solo
 * en memoria: no llaman a la API, no persisten y se reinician al recargar.
 */
export function DemoProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(createInitialDemoState);

  const pushToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    setState((prev) => ({
      ...prev,
      toasts: [...prev.toasts, { id: createDemoId('toast'), message, tone }],
    }));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setState((prev) => ({ ...prev, toasts: prev.toasts.filter((toast) => toast.id !== id) }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) => ({ ...item, read: true })),
    }));
  }, []);

  const saveMachine = useCallback(
    (item: NewMachine | Machine) => {
      const persisted = isPersisted<Machine>(item);
      const entity: Machine = persisted ? item : { ...item, id: createDemoId('mq') };
      setState((prev) =>
        withActivity(upsert(prev, 'machines', entity), {
          title: `Hoja de vida ${persisted ? 'actualizada' : 'registrada'}`,
          meta: `${entity.code} · ${entity.name}`,
          time: 'Ahora',
          tone: 'info',
        }),
      );
      pushToast(`Máquina ${entity.code} ${persisted ? 'actualizada' : 'registrada'} (simulado).`);
    },
    [pushToast],
  );

  const removeMachine = useCallback(
    (id: string) => {
      setState((prev) => remove(prev, 'machines', id));
      pushToast('Máquina retirada de la maqueta. No se eliminó ningún dato real.', 'warning');
    },
    [pushToast],
  );

  const setMachineStatus = useCallback((id: string, status: DemoStatus) => {
    setState((prev) => patchStatus(prev, 'machines', id, status));
  }, []);

  const saveSparePart = useCallback(
    (item: NewSparePart | SparePart) => {
      const persisted = isPersisted<SparePart>(item);
      const entity: SparePart = persisted ? item : { ...item, id: createDemoId('rp') };
      setState((prev) =>
        withActivity(upsert(prev, 'spareParts', entity), {
          title: `Repuesto ${persisted ? 'actualizado' : 'registrado'}`,
          meta: `${entity.code} · ${entity.name}`,
          time: 'Ahora',
          tone: 'info',
        }),
      );
      pushToast(`Repuesto ${entity.code} guardado (simulado).`);
    },
    [pushToast],
  );

  const removeSparePart = useCallback(
    (id: string) => {
      setState((prev) => remove(prev, 'spareParts', id));
      pushToast('Repuesto retirado de la maqueta. No se eliminó ningún dato real.', 'warning');
    },
    [pushToast],
  );

  const setSparePartStatus = useCallback((id: string, status: DemoStatus) => {
    setState((prev) => patchStatus(prev, 'spareParts', id, status));
  }, []);

  const saveRequest = useCallback(
    (item: NewSupplyRequest | SupplyRequest) => {
      const persisted = isPersisted<SupplyRequest>(item);
      const entity: SupplyRequest = persisted ? item : { ...item, id: createDemoId('sr') };
      setState((prev) =>
        withActivity(upsert(prev, 'requests', entity), {
          title: `Solicitud ${entity.code} ${persisted ? 'actualizada' : 'registrada'}`,
          meta: `${entity.item} · ${entity.machine}`,
          time: 'Ahora',
          tone: 'pending',
        }),
      );
      pushToast(`Solicitud ${entity.code} guardada (simulado).`);
    },
    [pushToast],
  );

  const removeRequest = useCallback(
    (id: string) => {
      setState((prev) => remove(prev, 'requests', id));
      pushToast('Solicitud retirada de la maqueta. No se eliminó ningún dato real.', 'warning');
    },
    [pushToast],
  );

  const setRequestStatus = useCallback((id: string, status: DemoStatus) => {
    setState((prev) => patchStatus(prev, 'requests', id, status));
  }, []);

  const saveNeedle = useCallback(
    (item: NewNeedle | Needle) => {
      const persisted = isPersisted<Needle>(item);
      const entity: Needle = persisted ? item : { ...item, id: createDemoId('ag') };
      setState((prev) =>
        withActivity(upsert(prev, 'needles', entity), {
          title: `Agujas ${entity.code} ${persisted ? 'actualizadas' : 'registradas'}`,
          meta: `${entity.gauge} · ${entity.machine}`,
          time: 'Ahora',
          tone: 'success',
        }),
      );
      pushToast(`Inventario de agujas ${entity.code} guardado (simulado).`);
    },
    [pushToast],
  );

  const removeNeedle = useCallback(
    (id: string) => {
      setState((prev) => remove(prev, 'needles', id));
      pushToast(
        'Registro de agujas retirado de la maqueta. No se eliminó ningún dato real.',
        'warning',
      );
    },
    [pushToast],
  );

  const setNeedleStatus = useCallback((id: string, status: DemoStatus) => {
    setState((prev) => patchStatus(prev, 'needles', id, status));
  }, []);

  const saveMaintenance = useCallback(
    (item: NewMaintenanceOrder | MaintenanceOrder) => {
      const persisted = isPersisted<MaintenanceOrder>(item);
      const entity: MaintenanceOrder = persisted ? item : { ...item, id: createDemoId('ot') };
      setState((prev) =>
        withActivity(upsert(prev, 'maintenance', entity), {
          title: `Orden ${entity.code} ${persisted ? 'actualizada' : 'programada'}`,
          meta: `${entity.machine} · ${entity.type}`,
          time: 'Ahora',
          tone: 'info',
        }),
      );
      pushToast(`Orden ${entity.code} guardada (simulado).`);
    },
    [pushToast],
  );

  const removeMaintenance = useCallback(
    (id: string) => {
      setState((prev) => remove(prev, 'maintenance', id));
      pushToast('Orden retirada de la maqueta. No se eliminó ningún dato real.', 'warning');
    },
    [pushToast],
  );

  const setMaintenanceStatus = useCallback((id: string, status: DemoStatus) => {
    setState((prev) => patchStatus(prev, 'maintenance', id, status));
  }, []);

  const saveCost = useCallback(
    (item: NewCostEntry | CostEntry) => {
      const persisted = isPersisted<CostEntry>(item);
      const entity: CostEntry = persisted ? item : { ...item, id: createDemoId('cj') };
      setState((prev) =>
        withActivity(upsert(prev, 'costs', entity), {
          title: `Registro de costos ${persisted ? 'actualizado' : 'creado'}`,
          meta: `${entity.period} · ${entity.category}`,
          time: 'Ahora',
          tone: 'info',
        }),
      );
      pushToast(`Costo ${entity.code} guardado (simulado).`);
    },
    [pushToast],
  );

  const saveUser = useCallback(
    (item: NewDemoUser | DemoUser) => {
      const persisted = isPersisted<DemoUser>(item);
      const entity: DemoUser = persisted ? item : { ...item, id: createDemoId('us') };
      setState((prev) =>
        withActivity(upsert(prev, 'users', entity), {
          title: `Usuario ${persisted ? 'actualizado' : 'registrado'}`,
          meta: `${entity.name} · ${entity.role}`,
          time: 'Ahora',
          tone: 'info',
        }),
      );
      pushToast(`Usuario ${entity.name} guardado (simulado).`);
    },
    [pushToast],
  );

  const setUserStatus = useCallback((id: string, status: DemoStatus) => {
    setState((prev) => patchStatus(prev, 'users', id, status));
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      unreadNotifications: state.notifications.filter((item) => !item.read).length,
      markAllNotificationsRead,
      saveMachine,
      removeMachine,
      setMachineStatus,
      saveSparePart,
      removeSparePart,
      setSparePartStatus,
      saveRequest,
      removeRequest,
      setRequestStatus,
      saveNeedle,
      removeNeedle,
      setNeedleStatus,
      saveMaintenance,
      removeMaintenance,
      setMaintenanceStatus,
      saveCost,
      saveUser,
      setUserStatus,
      pushToast,
      dismissToast,
    }),
    [
      state,
      markAllNotificationsRead,
      saveMachine,
      removeMachine,
      setMachineStatus,
      saveSparePart,
      removeSparePart,
      setSparePartStatus,
      saveRequest,
      removeRequest,
      setRequestStatus,
      saveNeedle,
      removeNeedle,
      setNeedleStatus,
      saveMaintenance,
      removeMaintenance,
      setMaintenanceStatus,
      saveCost,
      saveUser,
      setUserStatus,
      pushToast,
      dismissToast,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
