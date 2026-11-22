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
import type { SparePart } from '../lib/demo/types';

const schema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio.'),
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  category: z.string().trim().min(1, 'La categoría es obligatoria.'),
  compatibleMachine: z.string().trim().min(1, 'Indique la máquina compatible.'),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo.'),
  minStock: z.coerce.number().int().min(0, 'El mínimo no puede ser negativo.'),
  unit: z.string().trim().min(1, 'La unidad es obligatoria.'),
  location: z.string().trim().min(1, 'La ubicación es obligatoria.'),
  lastMovement: z.string().min(1, 'Indique la fecha del último movimiento.'),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const emptyForm: FormValues = {
  code: '',
  name: '',
  category: '',
  compatibleMachine: 'MQ-001',
  stock: 0,
  minStock: 0,
  unit: 'unidad',
  location: '',
  lastMovement: '2026-11-22',
};

const PAGE_SIZE = 6;

export function RepuestosPage() {
  const { spareParts, machines, saveSparePart, removeSparePart, setSparePartStatus } = useDemo();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<SparePart | null>(null);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<SparePart | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  const categories = useMemo(
    () => [...new Set(spareParts.map((item) => item.category))].sort(),
    [spareParts],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return spareParts.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.code} ${item.name} ${item.category} ${item.location}`.toLowerCase().includes(term);
      return matchesSearch && (category === 'all' || item.category === category);
    });
  }, [spareParts, search, category]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: SparePart) => {
    setEditing(item);
    reset({
      code: item.code,
      name: item.name,
      category: item.category,
      compatibleMachine: item.compatibleMachine,
      stock: item.stock,
      minStock: item.minStock,
      unit: item.unit,
      location: item.location,
      lastMovement: item.lastMovement,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = { ...values, status: editing?.status ?? STATUS.available };
    saveSparePart(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<SparePart>> = [
    {
      key: 'repuesto',
      header: 'Repuesto',
      render: (item) => (
        <>
          <span className="table__primary">{item.name}</span>
          <span className="table__secondary">
            {item.code} · {item.category}
          </span>
        </>
      ),
    },
    { key: 'maquina', header: 'Máquina compatible', render: (item) => item.compatibleMachine },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (item) => (
        <>
          <span>{formatNumber(item.stock)}</span>
          <span className="table__secondary">Mín. {formatNumber(item.minStock)}</span>
        </>
      ),
    },
    { key: 'ubicacion', header: 'Ubicación', render: (item) => item.location },
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
        eyebrow="Operación · Inventario"
        title="Repuestos"
        subtitle="Existencias por máquina compatible, ubicación de almacén y estado visible del inventario. Datos simulados."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nuevo repuesto
          </Button>
        }
      />

      <div className="toolbar">
        <div className="toolbar__group">
          <div className="toolbar__search">
            <Input
              type="search"
              placeholder="Buscar repuesto…"
              aria-label="Buscar repuestos"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: 'Todas las categorías' },
              ...categories.map((value) => ({ value, label: value })),
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
              title="Sin repuestos visibles"
              description="Probá con otro término de búsqueda o registrá un repuesto."
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
        title={editing ? `Editar ${editing.code}` : 'Nuevo repuesto'}
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
          <FormField label="Código" htmlFor="rp-code" required error={errors.code?.message}>
            <Input id="rp-code" {...register('code')} invalid={Boolean(errors.code)} />
          </FormField>
          <FormField label="Nombre" htmlFor="rp-name" required error={errors.name?.message}>
            <Input id="rp-name" {...register('name')} invalid={Boolean(errors.name)} />
          </FormField>
          <FormField
            label="Categoría"
            htmlFor="rp-category"
            required
            error={errors.category?.message}
          >
            <Input id="rp-category" {...register('category')} invalid={Boolean(errors.category)} />
          </FormField>
          <FormField
            label="Máquina compatible"
            htmlFor="rp-machine"
            required
            error={errors.compatibleMachine?.message}
          >
            <Select
              id="rp-machine"
              options={machines.map((item) => ({
                value: item.code,
                label: `${item.code} · ${item.name}`,
              }))}
              {...register('compatibleMachine')}
              invalid={Boolean(errors.compatibleMachine)}
            />
          </FormField>
          <FormField label="Stock actual" htmlFor="rp-stock" error={errors.stock?.message}>
            <Input
              id="rp-stock"
              type="number"
              min={0}
              {...register('stock')}
              invalid={Boolean(errors.stock)}
            />
          </FormField>
          <FormField label="Stock mínimo" htmlFor="rp-min" error={errors.minStock?.message}>
            <Input
              id="rp-min"
              type="number"
              min={0}
              {...register('minStock')}
              invalid={Boolean(errors.minStock)}
            />
          </FormField>
          <FormField label="Unidad" htmlFor="rp-unit" error={errors.unit?.message}>
            <Input id="rp-unit" {...register('unit')} invalid={Boolean(errors.unit)} />
          </FormField>
          <FormField
            label="Ubicación"
            htmlFor="rp-location"
            required
            error={errors.location?.message}
          >
            <Input id="rp-location" {...register('location')} invalid={Boolean(errors.location)} />
          </FormField>
          <FormField
            label="Último movimiento"
            htmlFor="rp-date"
            required
            error={errors.lastMovement?.message}
          >
            <Input
              id="rp-date"
              type="date"
              {...register('lastMovement')}
              invalid={Boolean(errors.lastMovement)}
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.name}` : 'Detalle'}
        subtitle="Consulta simulada de inventario"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {detail ? (
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item__label">Categoría</span>
              <span className="detail-item__value">{detail.category}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Máquina compatible</span>
              <span className="detail-item__value">{detail.compatibleMachine}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Stock</span>
              <span className="detail-item__value">
                {formatNumber(detail.stock)} {detail.unit}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Stock mínimo</span>
              <span className="detail-item__value">
                {formatNumber(detail.minStock)} {detail.unit}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Ubicación</span>
              <span className="detail-item__value">{detail.location}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Último movimiento</span>
              <span className="detail-item__value">{formatDate(detail.lastMovement)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Estado</span>
              <span className="detail-item__value">
                <StatusBadge status={detail.status} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Opciones</span>
              <span className="detail-item__value">
                <Select
                  aria-label="Cambiar estado visible"
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
                      setSparePartStatus(detail.id, option.status);
                      setDetail({ ...detail, status: option.status });
                    }
                  }}
                />
              </span>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title="Retirar repuesto de la maqueta"
        message={`Se retirará ${pendingRemoval?.code ?? ''} de la vista. Acción simulada, sin borrado real.`}
        confirmLabel="Retirar (simulado)"
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval) removeSparePart(pendingRemoval.id);
          setPendingRemoval(null);
        }}
      />
    </div>
  );
}
