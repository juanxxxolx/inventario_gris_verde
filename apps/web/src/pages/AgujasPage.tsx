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
import { STATUS, STATUS_OPTIONS } from '../lib/demo/data';
import { formatDate, formatNumber } from '../lib/demo/format';
import { useDemo } from '../lib/demo/store';
import type { Needle } from '../lib/demo/types';

const schema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio.'),
  gauge: z.string().trim().min(1, 'Indique el calibre.'),
  type: z.string().trim().min(1, 'Indique el tipo de punta.'),
  machine: z.string().trim().min(1, 'Indique la máquina asociada.'),
  quantity: z.coerce.number().int().min(0, 'La cantidad no puede ser negativa.'),
  location: z.string().trim().min(1, 'La ubicación es obligatoria.'),
  supplier: z.string().trim().min(1, 'El proveedor es obligatorio.'),
  updatedAt: z.string().min(1, 'Indique la fecha de actualización.'),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const emptyForm: FormValues = {
  code: '',
  gauge: '',
  type: 'Punta de bola',
  machine: 'MQ-001',
  quantity: 0,
  location: '',
  supplier: '',
  updatedAt: '2026-11-22',
};

const PAGE_SIZE = 6;

export function AgujasPage() {
  const { needles, machines, saveNeedle, removeNeedle, setNeedleStatus } = useDemo();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Needle | null>(null);
  const [editing, setEditing] = useState<Needle | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Needle | null>(null);

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
    return needles.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.code} ${item.gauge} ${item.type} ${item.machine} ${item.supplier}`
          .toLowerCase()
          .includes(term);
      return matchesSearch && (statusFilter === 'all' || item.status.tone === statusFilter);
    });
  }, [needles, search, statusFilter]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalUnits = needles.reduce((sum, item) => sum + item.quantity, 0);

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: Needle) => {
    setEditing(item);
    reset({
      code: item.code,
      gauge: item.gauge,
      type: item.type,
      machine: item.machine,
      quantity: item.quantity,
      location: item.location,
      supplier: item.supplier,
      updatedAt: item.updatedAt,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = { ...values, status: editing?.status ?? STATUS.available };
    saveNeedle(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<Needle>> = [
    {
      key: 'aguja',
      header: 'Aguja',
      render: (item) => (
        <>
          <span className="table__primary">{item.code}</span>
          <span className="table__secondary">
            {item.gauge} · {item.type}
          </span>
        </>
      ),
    },
    { key: 'maquina', header: 'Máquina', render: (item) => item.machine },
    {
      key: 'cantidad',
      header: 'Cantidad',
      align: 'right',
      render: (item) => formatNumber(item.quantity),
    },
    { key: 'ubicacion', header: 'Ubicación', render: (item) => item.location },
    { key: 'proveedor', header: 'Proveedor', render: (item) => item.supplier },
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
        eyebrow="Operación · Consumibles"
        title="Inventario de agujas"
        subtitle="Control visual de agujas por calibre, tipo, máquina y proveedor. No se calculan consumos ni reposiciones automáticas."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nueva referencia
          </Button>
        }
      />

      <div className="horizontal-cards">
        <Card title="Unidades visibles" meta="Suma de la maqueta">
          <strong className="metric-card__value">{formatNumber(totalUnits)}</strong>
        </Card>
        <Card title="Referencias registradas" meta="Códigos de aguja">
          <strong className="metric-card__value">{needles.length}</strong>
        </Card>
        <Card title="Sin existencias" meta="Estado visible">
          <strong className="metric-card__value">
            {needles.filter((item) => item.status.tone === 'error').length}
          </strong>
        </Card>
      </div>

      <div className="toolbar">
        <div className="toolbar__group">
          <div className="toolbar__search">
            <Input
              type="search"
              placeholder="Buscar aguja, calibre o proveedor…"
              aria-label="Buscar agujas"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Todos los estados' },
              ...STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
            ]}
          />
        </div>
        <span className="card__meta">{filtered.length} resultado(s)</span>
      </div>

      <DataTable
        columns={columns}
        rows={pageItems}
        empty={
          <Card flush>
            <EmptyState
              title="Sin agujas visibles"
              description="Ajustá los filtros o registrá una referencia nueva."
            />
          </Card>
        }
      />
      <Pagination
        page={Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Editar ${editing.code}` : 'Nueva referencia de aguja'}
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
          <FormField label="Código" htmlFor="ag-code" required error={errors.code?.message}>
            <Input id="ag-code" {...register('code')} invalid={Boolean(errors.code)} />
          </FormField>
          <FormField label="Calibre" htmlFor="ag-gauge" required error={errors.gauge?.message}>
            <Input id="ag-gauge" {...register('gauge')} invalid={Boolean(errors.gauge)} />
          </FormField>
          <FormField label="Tipo de punta" htmlFor="ag-type" required error={errors.type?.message}>
            <Input id="ag-type" {...register('type')} invalid={Boolean(errors.type)} />
          </FormField>
          <FormField label="Máquina" htmlFor="ag-machine" required error={errors.machine?.message}>
            <Select
              id="ag-machine"
              options={machines.map((item) => ({
                value: item.code,
                label: `${item.code} · ${item.name}`,
              }))}
              {...register('machine')}
            />
          </FormField>
          <FormField label="Cantidad" htmlFor="ag-qty" error={errors.quantity?.message}>
            <Input
              id="ag-qty"
              type="number"
              min={0}
              {...register('quantity')}
              invalid={Boolean(errors.quantity)}
            />
          </FormField>
          <FormField
            label="Ubicación"
            htmlFor="ag-location"
            required
            error={errors.location?.message}
          >
            <Input id="ag-location" {...register('location')} invalid={Boolean(errors.location)} />
          </FormField>
          <FormField
            label="Proveedor"
            htmlFor="ag-supplier"
            required
            error={errors.supplier?.message}
          >
            <Input id="ag-supplier" {...register('supplier')} invalid={Boolean(errors.supplier)} />
          </FormField>
          <FormField
            label="Actualización"
            htmlFor="ag-date"
            required
            error={errors.updatedAt?.message}
          >
            <Input
              id="ag-date"
              type="date"
              {...register('updatedAt')}
              invalid={Boolean(errors.updatedAt)}
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.gauge}` : 'Detalle'}
        subtitle="Consulta simulada de inventario de agujas"
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
                <span className="detail-item__label">Máquina</span>
                <span className="detail-item__value">{detail.machine}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Cantidad</span>
                <span className="detail-item__value">{formatNumber(detail.quantity)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Ubicación</span>
                <span className="detail-item__value">{detail.location}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Proveedor</span>
                <span className="detail-item__value">{detail.supplier}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Actualización</span>
                <span className="detail-item__value">{formatDate(detail.updatedAt)}</span>
              </div>
            </div>
            <FormField label="Estado visible (simulado)" htmlFor="ag-detail-status">
              <Select
                id="ag-detail-status"
                value={
                  STATUS_OPTIONS.find((option) => option.label === detail.status.label)?.value ??
                  'available'
                }
                options={STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) => {
                  const option = STATUS_OPTIONS.find((item) => item.value === event.target.value);
                  if (option) {
                    setNeedleStatus(detail.id, option.status);
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
        title="Retirar referencia de la maqueta"
        message={`Se retirará ${pendingRemoval?.code ?? ''} de la vista. Acción simulada, sin borrado real.`}
        confirmLabel="Retirar (simulado)"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) removeNeedle(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
}
