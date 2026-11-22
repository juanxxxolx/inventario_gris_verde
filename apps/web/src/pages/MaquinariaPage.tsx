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
import { STATUS, STATUS_OPTIONS } from '../lib/demo/data';
import { formatDate, formatNumber } from '../lib/demo/format';
import { useDemo } from '../lib/demo/store';
import type { Machine } from '../lib/demo/types';

const schema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio.'),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  brand: z.string().trim().min(1, 'La marca es obligatoria.'),
  model: z.string().trim().min(1, 'El modelo es obligatorio.'),
  serial: z.string().trim().min(1, ' El número de serie es obligatorio.'),
  location: z.string().trim().min(1, 'La ubicación es obligatoria.'),
  operator: z.string().trim().min(1, 'El operador es obligatorio.'),
  hours: z.coerce.number().int().min(0, 'Las horas no pueden ser negativas.'),
  lastMaintenance: z.string().min(1, 'Indique la última revisión.'),
  nextMaintenance: z.string().min(1, 'Indique la próxima revisión.'),
  notes: z.string(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const emptyForm: FormValues = {
  code: '',
  name: '',
  brand: '',
  model: '',
  serial: '',
  location: '',
  operator: '',
  hours: 0,
  lastMaintenance: '',
  nextMaintenance: '',
  notes: '',
};

const PAGE_SIZE = 6;

export function MaquinariaPage() {
  const { machines, saveMachine, removeMachine, setMachineStatus } = useDemo();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Machine | null>(null);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Machine | null>(null);

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
    return machines.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.code} ${item.name} ${item.brand} ${item.model} ${item.location} ${item.operator}`
          .toLowerCase()
          .includes(term);
      const matchesStatus = statusFilter === 'all' || item.status.tone === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [machines, search, statusFilter]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: Machine) => {
    setEditing(item);
    reset({
      code: item.code,
      name: item.name,
      brand: item.brand,
      model: item.model,
      serial: item.serial,
      location: item.location,
      operator: item.operator,
      hours: item.hours,
      lastMaintenance: item.lastMaintenance,
      nextMaintenance: item.nextMaintenance,
      notes: item.notes,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = {
      code: values.code,
      name: values.name,
      brand: values.brand,
      model: values.model,
      serial: values.serial,
      location: values.location,
      operator: values.operator,
      hours: values.hours,
      lastMaintenance: values.lastMaintenance,
      nextMaintenance: values.nextMaintenance,
      notes: values.notes,
      status: editing?.status ?? STATUS.operative,
    };
    saveMachine(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<Machine>> = [
    {
      key: 'equipo',
      header: 'Equipo',
      render: (item) => (
        <>
          <span className="table__primary">{item.name}</span>
          <span className="table__secondary">
            {item.code} · {item.brand} {item.model}
          </span>
        </>
      ),
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      render: (item) => (
        <>
          <span>{item.location}</span>
          <span className="table__secondary">Operador: {item.operator}</span>
        </>
      ),
    },
    {
      key: 'horas',
      header: 'Horas',
      align: 'right',
      render: (item) => <span className="table__number">{formatNumber(item.hours)}</span>,
    },
    {
      key: 'proxima',
      header: 'Próxima revisión',
      render: (item) => formatDate(item.nextMaintenance),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => <StatusBadge status={item.status} />,
    },
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
        eyebrow="Operación · Maquinaria"
        title="Maquinaria y hojas de vida"
        subtitle="Equipos de la planta, su ubicación, operador, estado y fechas de revisión. Registros simulados."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nueva máquina
          </Button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__group">
          <div className="toolbar__search">
            <Input
              type="search"
              placeholder="Buscar por código, nombre o ubicación…"
              aria-label="Buscar maquinaria"
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
              title="No hay maquinaria que coincida"
              description="Ajustá la búsqueda o el filtro, o registrá una máquina nueva en la maqueta."
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
        title={editing ? `Editar ${editing.code}` : 'Nueva máquina'}
        subtitle="Operación simulada: no persiste al recargar la página."
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
          <FormField label="Código" htmlFor="mq-code" required error={errors.code?.message}>
            <Input id="mq-code" {...register('code')} invalid={Boolean(errors.code)} />
          </FormField>
          <FormField
            label="Nombre del equipo"
            htmlFor="mq-name"
            required
            error={errors.name?.message}
          >
            <Input id="mq-name" {...register('name')} invalid={Boolean(errors.name)} />
          </FormField>
          <FormField label="Marca" htmlFor="mq-brand" required error={errors.brand?.message}>
            <Input id="mq-brand" {...register('brand')} invalid={Boolean(errors.brand)} />
          </FormField>
          <FormField label="Modelo" htmlFor="mq-model" required error={errors.model?.message}>
            <Input id="mq-model" {...register('model')} invalid={Boolean(errors.model)} />
          </FormField>
          <FormField
            label="Número de serie"
            htmlFor="mq-serial"
            required
            error={errors.serial?.message}
          >
            <Input id="mq-serial" {...register('serial')} invalid={Boolean(errors.serial)} />
          </FormField>
          <FormField
            label="Ubicación"
            htmlFor="mq-location"
            required
            error={errors.location?.message}
          >
            <Input id="mq-location" {...register('location')} invalid={Boolean(errors.location)} />
          </FormField>
          <FormField
            label="Operador"
            htmlFor="mq-operator"
            required
            error={errors.operator?.message}
          >
            <Input id="mq-operator" {...register('operator')} invalid={Boolean(errors.operator)} />
          </FormField>
          <FormField label="Horas de uso" htmlFor="mq-hours" error={errors.hours?.message}>
            <Input
              id="mq-hours"
              type="number"
              min={0}
              {...register('hours')}
              invalid={Boolean(errors.hours)}
            />
          </FormField>
          <FormField
            label="Última revisión"
            htmlFor="mq-last"
            required
            error={errors.lastMaintenance?.message}
          >
            <Input
              id="mq-last"
              type="date"
              {...register('lastMaintenance')}
              invalid={Boolean(errors.lastMaintenance)}
            />
          </FormField>
          <FormField
            label="Próxima revisión"
            htmlFor="mq-next"
            required
            error={errors.nextMaintenance?.message}
          >
            <Input
              id="mq-next"
              type="date"
              {...register('nextMaintenance')}
              invalid={Boolean(errors.nextMaintenance)}
            />
          </FormField>
          <FormField label="Observaciones" htmlFor="mq-notes" fullWidth>
            <Textarea id="mq-notes" rows={3} {...register('notes')} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.name}` : 'Detalle'}
        subtitle="Consulta simulada de la hoja de vida"
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
                <span className="detail-item__label">Marca y modelo</span>
                <span className="detail-item__value">
                  {detail.brand} {detail.model}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Número de serie</span>
                <span className="detail-item__value">{detail.serial}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Ubicación</span>
                <span className="detail-item__value">{detail.location}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Operador</span>
                <span className="detail-item__value">{detail.operator}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Horas de uso</span>
                <span className="detail-item__value">{formatNumber(detail.hours)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Próxima revisión</span>
                <span className="detail-item__value">{formatDate(detail.nextMaintenance)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Última revisión</span>
                <span className="detail-item__value">{formatDate(detail.lastMaintenance)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Observaciones</span>
                <span className="detail-item__value">{detail.notes}</span>
              </div>
            </div>
            <FormField label="Estado visible (simulado)" htmlFor="mq-detail-status">
              <Select
                id="mq-detail-status"
                value={
                  STATUS_OPTIONS.find((option) => option.label === detail.status.label)?.value ??
                  'operative'
                }
                options={STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) => {
                  const option = STATUS_OPTIONS.find((item) => item.value === event.target.value);
                  if (option) {
                    setMachineStatus(detail.id, option.status);
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
        title="Retirar máquina de la maqueta"
        message={`Se retirará ${pendingRemoval?.code ?? ''} de la vista. Esta acción es simulada, no elimina datos reales y se puede restaurar recargando la página.`}
        confirmLabel="Retirar (simulado)"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) {
            removeMachine(pendingRemoval.id);
          }
          setPendingRemoval(null);
        }}
      />
    </div>
  );
}
