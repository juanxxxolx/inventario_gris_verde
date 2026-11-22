import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import { STATUS, STATUS_OPTIONS } from '../lib/demo/data';
import { formatDate } from '../lib/demo/format';
import { useDemo } from '../lib/demo/store';
import type { MaintenanceOrder } from '../lib/demo/types';

const schema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio.'),
  machine: z.string().trim().min(1, 'Indique la máquina.'),
  type: z.enum(['Preventivo', 'Correctivo', 'Predictivo']),
  scheduledFor: z.string().min(1, 'Indique la fecha programada.'),
  assignedTo: z.string().trim().min(1, 'Indique el responsable.'),
  durationMinutes: z.coerce.number().int().positive('La duración debe ser mayor que cero.'),
  priority: z.enum(['Alta', 'Media', 'Baja']),
  checklist: z.string(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const emptyForm: FormValues = {
  code: '',
  machine: 'MQ-001',
  type: 'Preventivo',
  scheduledFor: '2026-11-25',
  assignedTo: '',
  durationMinutes: 60,
  priority: 'Media',
  checklist: '',
};

const TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'open', label: 'Pendientes y en curso' },
  { id: 'done', label: 'Completadas' },
] as const;

const PAGE_SIZE = 6;

export function MantenimientoPage() {
  const { maintenance, machines, saveMaintenance, removeMaintenance, setMaintenanceStatus } =
    useDemo();
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<MaintenanceOrder | null>(null);
  const [editing, setEditing] = useState<MaintenanceOrder | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<MaintenanceOrder | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return maintenance.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.code} ${item.machine} ${item.type} ${item.assignedTo}`.toLowerCase().includes(term);
      const matchesTab =
        tab === 'all' ||
        (tab === 'open' && item.status.tone !== 'success') ||
        (tab === 'done' && item.status.tone === 'success');
      return matchesSearch && matchesTab;
    });
  }, [maintenance, search, tab]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const tabItems = TABS.map((item) => ({
    ...item,
    count:
      item.id === 'all'
        ? maintenance.length
        : maintenance.filter((order) =>
            item.id === 'open' ? order.status.tone !== 'success' : order.status.tone === 'success',
          ).length,
  }));

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: MaintenanceOrder) => {
    setEditing(item);
    reset({
      code: item.code,
      machine: item.machine,
      type: item.type,
      scheduledFor: item.scheduledFor,
      assignedTo: item.assignedTo,
      durationMinutes: item.durationMinutes,
      priority: item.priority,
      checklist: item.checklist.join('; '),
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = {
      ...values,
      checklist: values.checklist
        .split(';')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
      status: editing?.status ?? STATUS.scheduled,
    };
    saveMaintenance(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<MaintenanceOrder>> = [
    {
      key: 'orden',
      header: 'Orden',
      render: (item) => (
        <>
          <span className="table__primary">{item.code}</span>
          <span className="table__secondary">
            {item.type} · {item.priority}
          </span>
        </>
      ),
    },
    { key: 'maquina', header: 'Máquina', render: (item) => item.machine },
    { key: 'fecha', header: 'Programada', render: (item) => formatDate(item.scheduledFor) },
    { key: 'responsable', header: 'Responsable', render: (item) => item.assignedTo },
    {
      key: 'duracion',
      header: 'Duración',
      align: 'right',
      render: (item) => `${item.durationMinutes} min`,
    },
    { key: 'estado', header: 'Estado', render: (item) => <StatusBadge status={item.status} /> },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'right',
      render: (item) => (
        <div className="table__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetail(item)}
            aria-label={`Ver ${item.code}`}
          >
            <Eye size={15} aria-hidden="true" /> Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openEdit(item)}
            aria-label={`Editar ${item.code}`}
          >
            <Pencil size={14} aria-hidden="true" /> Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setPendingRemoval(item)}
            aria-label={`Retirar ${item.code}`}
          >
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Operación · Mantenimiento"
        title="Mantenimiento"
        subtitle="Órdenes programadas, responsables, checklist y estado visible. No se generan órdenes reales ni se descuentan repuestos."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nueva orden
          </Button>
        }
      />

      <Card flush>
        <Tabs items={tabItems} value={tab} onChange={setTab} label="Filtrar órdenes" />
        <div className="toolbar toolbar--flat">
          <div className="toolbar__search">
            <Input
              type="search"
              placeholder="Buscar orden, máquina o responsable…"
              aria-label="Buscar mantenimiento"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <span className="card__meta">{filtered.length} resultado(s)</span>
        </div>
        <DataTable
          columns={columns}
          rows={pageItems}
          empty={
            <EmptyState
              title="Sin órdenes para este filtro"
              description="Probá otra búsqueda o programá una orden en la maqueta."
            />
          }
        />
      </Card>
      <Pagination
        page={Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Editar ${editing.code}` : 'Nueva orden de mantenimiento'}
        subtitle="Operación simulada: no persiste al recargar."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit(onSubmit)()}>Guardar (simulado)</Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={(event) => event.preventDefault()} noValidate>
          <FormField label="Código" htmlFor="ot-code" required error={errors.code?.message}>
            <Input id="ot-code" {...register('code')} invalid={Boolean(errors.code)} />
          </FormField>
          <FormField label="Máquina" htmlFor="ot-machine" required error={errors.machine?.message}>
            <Select
              id="ot-machine"
              options={machines.map((item) => ({
                value: item.code,
                label: `${item.code} · ${item.name}`,
              }))}
              {...register('machine')}
            />
          </FormField>
          <FormField label="Tipo" htmlFor="ot-type" error={errors.type?.message}>
            <Select
              id="ot-type"
              options={[
                { value: 'Preventivo', label: 'Preventivo' },
                { value: 'Correctivo', label: 'Correctivo' },
                { value: 'Predictivo', label: 'Predictivo' },
              ]}
              {...register('type')}
            />
          </FormField>
          <FormField
            label="Fecha programada"
            htmlFor="ot-date"
            required
            error={errors.scheduledFor?.message}
          >
            <Input
              id="ot-date"
              type="date"
              {...register('scheduledFor')}
              invalid={Boolean(errors.scheduledFor)}
            />
          </FormField>
          <FormField
            label="Responsable"
            htmlFor="ot-owner"
            required
            error={errors.assignedTo?.message}
          >
            <Input id="ot-owner" {...register('assignedTo')} invalid={Boolean(errors.assignedTo)} />
          </FormField>
          <FormField
            label="Duración (min)"
            htmlFor="ot-duration"
            error={errors.durationMinutes?.message}
          >
            <Input
              id="ot-duration"
              type="number"
              min={1}
              {...register('durationMinutes')}
              invalid={Boolean(errors.durationMinutes)}
            />
          </FormField>
          <FormField label="Prioridad" htmlFor="ot-priority" error={errors.priority?.message}>
            <Select
              id="ot-priority"
              options={[
                { value: 'Alta', label: 'Alta' },
                { value: 'Media', label: 'Media' },
                { value: 'Baja', label: 'Baja' },
              ]}
              {...register('priority')}
            />
          </FormField>
          <FormField
            label="Checklist"
            htmlFor="ot-checklist"
            fullWidth
            hint="Separá cada actividad con punto y coma (;)."
          >
            <Input id="ot-checklist" {...register('checklist')} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.machine}` : 'Detalle'}
        subtitle="Consulta simulada de orden de mantenimiento"
        wide
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {detail ? (
          <div className="stack">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-item__label">Tipo</span>
                <span className="detail-item__value">{detail.type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Prioridad</span>
                <span className="detail-item__value">{detail.priority}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Fecha programada</span>
                <span className="detail-item__value">{formatDate(detail.scheduledFor)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Responsable</span>
                <span className="detail-item__value">{detail.assignedTo}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Duración</span>
                <span className="detail-item__value">{detail.durationMinutes} min</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Checklist</span>
                <span className="detail-item__value">{detail.checklist.join(' · ')}</span>
              </div>
            </div>
            <FormField
              label="Estado visible (simulado)"
              htmlFor="ot-detail-status"
              hint="El cambio de estado no cierra la orden en un sistema real."
            >
              <Select
                id="ot-detail-status"
                value={
                  STATUS_OPTIONS.find((option) => option.label === detail.status.label)?.value ??
                  'scheduled'
                }
                options={STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) => {
                  const option = STATUS_OPTIONS.find((item) => item.value === event.target.value);
                  if (option) {
                    setMaintenanceStatus(detail.id, option.status);
                    setDetail({ ...detail, status: option.status });
                  }
                }}
              />
            </FormField>
            <div>
              <StatusBadge status={detail.status} />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Retirar orden de la maqueta"
        message={`Se retirará ${pendingRemoval?.code ?? ''} de la vista. Acción simulada, sin borrado real.`}
        confirmLabel="Retirar (simulado)"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) removeMaintenance(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
}
