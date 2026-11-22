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
import { Input, Textarea } from '../components/ui/Inputs';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Tabs } from '../components/ui/Tabs';
import { STATUS, STATUS_OPTIONS } from '../lib/demo/data';
import { formatDate } from '../lib/demo/format';
import { useDemo } from '../lib/demo/store';
import type { SupplyRequest } from '../lib/demo/types';

const schema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio.'),
  item: z.string().trim().min(1, 'Indique el material solicitado.'),
  quantity: z.coerce.number().int().positive('La cantidad debe ser mayor que cero.'),
  unit: z.string().trim().min(1, 'La unidad es obligatoria.'),
  requester: z.string().trim().min(1, 'Indique quién solicita.'),
  machine: z.string().trim().min(1, 'Indique la máquina asociada.'),
  priority: z.enum(['Alta', 'Media', 'Baja']),
  requestedAt: z.string().min(1, 'Indique la fecha de solicitud.'),
  notes: z.string(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const emptyForm: FormValues = {
  code: '',
  item: '',
  quantity: 1,
  unit: 'unidades',
  requester: '',
  machine: 'MQ-001',
  priority: 'Media',
  requestedAt: '2026-11-22',
  notes: '',
};

const TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'progress', label: 'En trámite' },
  { id: 'closed', label: 'Cerradas' },
] as const;

const PAGE_SIZE = 6;

export function SolicitudesPage() {
  const { requests, machines, saveRequest, removeRequest, setRequestStatus } = useDemo();
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SupplyRequest | null>(null);
  const [editing, setEditing] = useState<SupplyRequest | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<SupplyRequest | null>(null);

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
    return requests.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.code} ${item.item} ${item.requester} ${item.machine}`.toLowerCase().includes(term);
      const tone = item.status.tone;
      const matchesTab =
        tab === 'all' ||
        (tab === 'pending' && tone === 'pending') ||
        (tab === 'progress' && (tone === 'info' || tone === 'warning')) ||
        (tab === 'closed' && (tone === 'success' || tone === 'error'));
      return matchesSearch && matchesTab;
    });
  }, [requests, search, tab]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const tabItems = TABS.map((item) => ({
    ...item,
    count:
      item.id === 'all'
        ? requests.length
        : requests.filter((request) => {
            const tone = request.status.tone;
            return item.id === 'pending'
              ? tone === 'pending'
              : item.id === 'progress'
                ? tone === 'info' || tone === 'warning'
                : tone === 'success' || tone === 'error';
          }).length,
  }));

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: SupplyRequest) => {
    setEditing(item);
    reset({
      code: item.code,
      item: item.item,
      quantity: item.quantity,
      unit: item.unit,
      requester: item.requester,
      machine: item.machine,
      priority: item.priority,
      requestedAt: item.requestedAt,
      notes: item.notes,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = { ...values, status: editing?.status ?? STATUS.pending };
    saveRequest(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<SupplyRequest>> = [
    {
      key: 'solicitud',
      header: 'Solicitud',
      render: (item) => (
        <>
          <span className="table__primary">{item.item}</span>
          <span className="table__secondary">
            {item.code} · {item.quantity} {item.unit}
          </span>
        </>
      ),
    },
    {
      key: 'origen',
      header: 'Solicitante / máquina',
      render: (item) => (
        <>
          <span>{item.requester}</span>
          <span className="table__secondary">{item.machine}</span>
        </>
      ),
    },
    { key: 'fecha', header: 'Fecha', render: (item) => formatDate(item.requestedAt) },
    {
      key: 'prioridad',
      header: 'Prioridad',
      render: (item) => (
        <span className={`badge ${item.priority === 'Alta' ? 'badge--warning' : 'badge--neutral'}`}>
          {item.priority}
        </span>
      ),
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
        eyebrow="Operación · Logística"
        title="Solicitudes y entregas"
        subtitle="Seguimiento visual de solicitudes de materiales, prioridad y estado. No se aplican reglas de aprobación reales."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nueva solicitud
          </Button>
        }
      />

      <Card flush>
        <Tabs items={tabItems} value={tab} onChange={setTab} label="Filtrar solicitudes" />
        <div className="toolbar toolbar--flat">
          <div className="toolbar__search">
            <Input
              type="search"
              placeholder="Buscar por código, material o solicitante…"
              aria-label="Buscar solicitudes"
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
              title="No hay solicitudes para este filtro"
              description="Cambiá de pestaña, ajustá la búsqueda o registrá una solicitud nueva."
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
        title={editing ? `Editar ${editing.code}` : 'Nueva solicitud'}
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
          <FormField label="Código" htmlFor="sr-code" required error={errors.code?.message}>
            <Input id="sr-code" {...register('code')} invalid={Boolean(errors.code)} />
          </FormField>
          <FormField
            label="Material solicitado"
            htmlFor="sr-item"
            required
            error={errors.item?.message}
          >
            <Input id="sr-item" {...register('item')} invalid={Boolean(errors.item)} />
          </FormField>
          <FormField label="Cantidad" htmlFor="sr-qty" error={errors.quantity?.message}>
            <Input
              id="sr-qty"
              type="number"
              min={1}
              {...register('quantity')}
              invalid={Boolean(errors.quantity)}
            />
          </FormField>
          <FormField label="Unidad" htmlFor="sr-unit" error={errors.unit?.message}>
            <Input id="sr-unit" {...register('unit')} invalid={Boolean(errors.unit)} />
          </FormField>
          <FormField
            label="Solicitante"
            htmlFor="sr-requester"
            required
            error={errors.requester?.message}
          >
            <Input
              id="sr-requester"
              {...register('requester')}
              invalid={Boolean(errors.requester)}
            />
          </FormField>
          <FormField label="Máquina" htmlFor="sr-machine" required error={errors.machine?.message}>
            <Select
              id="sr-machine"
              options={machines.map((item) => ({
                value: item.code,
                label: `${item.code} · ${item.name}`,
              }))}
              {...register('machine')}
              invalid={Boolean(errors.machine)}
            />
          </FormField>
          <FormField label="Prioridad" htmlFor="sr-priority" error={errors.priority?.message}>
            <Select
              id="sr-priority"
              options={[
                { value: 'Alta', label: 'Alta' },
                { value: 'Media', label: 'Media' },
                { value: 'Baja', label: 'Baja' },
              ]}
              {...register('priority')}
            />
          </FormField>
          <FormField
            label="Fecha de solicitud"
            htmlFor="sr-date"
            required
            error={errors.requestedAt?.message}
          >
            <Input
              id="sr-date"
              type="date"
              {...register('requestedAt')}
              invalid={Boolean(errors.requestedAt)}
            />
          </FormField>
          <FormField label="Notas" htmlFor="sr-notes" fullWidth>
            <Textarea id="sr-notes" rows={3} {...register('notes')} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.item}` : 'Detalle'}
        subtitle="Consulta simulada de solicitud"
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
                <span className="detail-item__label">Solicitante</span>
                <span className="detail-item__value">{detail.requester}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Máquina</span>
                <span className="detail-item__value">{detail.machine}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Cantidad</span>
                <span className="detail-item__value">
                  {detail.quantity} {detail.unit}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Prioridad</span>
                <span className="detail-item__value">{detail.priority}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Fecha</span>
                <span className="detail-item__value">{formatDate(detail.requestedAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Notas</span>
                <span className="detail-item__value">{detail.notes}</span>
              </div>
            </div>
            <FormField
              label="Estado visible (simulado)"
              htmlFor="sr-detail-status"
              hint="Cambiar el estado no ejecuta aprobaciones ni entregas reales."
            >
              <Select
                id="sr-detail-status"
                value={
                  STATUS_OPTIONS.find((option) => option.label === detail.status.label)?.value ??
                  'pending'
                }
                options={STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) => {
                  const option = STATUS_OPTIONS.find((item) => item.value === event.target.value);
                  if (option) {
                    setRequestStatus(detail.id, option.status);
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
        title="Retirar solicitud de la maqueta"
        message={`Se retirará ${pendingRemoval?.code ?? ''} de la vista. Acción simulada, sin borrado real.`}
        confirmLabel="Retirar (simulado)"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) removeRequest(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
}
