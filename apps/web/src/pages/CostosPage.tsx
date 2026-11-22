import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, BarChart3, Eye, Pencil, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { FormField } from '../components/ui/FormField';
import { Input } from '../components/ui/Inputs';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { STATUS } from '../lib/demo/data';
import { compactCurrency, formatCurrency } from '../lib/demo/format';
import { useDemo } from '../lib/demo/store';
import type { CostEntry } from '../lib/demo/types';

const schema = z.object({
  code: z.string().trim().min(1, 'El código es obligatorio.'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Use el formato AAAA-MM.'),
  concept: z.string().trim().min(1, 'El concepto es obligatorio.'),
  category: z.string().trim().min(1, 'La categoría es obligatoria.'),
  budget: z.coerce.number().nonnegative('El presupuesto no puede ser negativo.'),
  actual: z.coerce.number().nonnegative('El valor ejecutado no puede ser negativo.'),
  owner: z.string().trim().min(1, 'Indique el responsable.'),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const emptyForm: FormValues = {
  code: '',
  period: '2026-11',
  concept: '',
  category: 'Mantenimiento',
  budget: 0,
  actual: 0,
  owner: '',
};

const PAGE_SIZE = 6;

export function CostosPage() {
  const { costs, saveCost } = useDemo();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<CostEntry | null>(null);
  const [editing, setEditing] = useState<CostEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);

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
    () => [...new Set(costs.map((item) => item.category))].sort(),
    [costs],
  );

  const byCategory = useMemo(() => {
    const groups = new Map<string, { budget: number; actual: number }>();
    for (const item of costs) {
      const current = groups.get(item.category) ?? { budget: 0, actual: 0 };
      current.budget += item.budget;
      current.actual += item.actual;
      groups.set(item.category, current);
    }
    return [...groups.entries()].map(([name, values]) => ({ name, ...values }));
  }, [costs]);

  const totalBudget = costs.reduce((sum, item) => sum + item.budget, 0);
  const totalActual = costs.reduce((sum, item) => sum + item.actual, 0);
  const variance = totalBudget - totalActual;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return costs.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.code} ${item.concept} ${item.category} ${item.period} ${item.owner}`
          .toLowerCase()
          .includes(term);
      return matchesSearch && (category === 'all' || item.category === category);
    });
  }, [costs, search, category]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: CostEntry) => {
    setEditing(item);
    reset({
      code: item.code,
      period: item.period,
      concept: item.concept,
      category: item.category,
      budget: item.budget,
      actual: item.actual,
      owner: item.owner,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = { ...values, status: editing?.status ?? STATUS.approved };
    saveCost(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<CostEntry>> = [
    {
      key: 'registro',
      header: 'Registro',
      render: (item) => (
        <>
          <span className="table__primary">{item.concept}</span>
          <span className="table__secondary">
            {item.code} · {item.period}
          </span>
        </>
      ),
    },
    { key: 'categoria', header: 'Categoría', render: (item) => item.category },
    {
      key: 'presupuesto',
      header: 'Presupuesto',
      align: 'right',
      render: (item) => formatCurrency(item.budget),
    },
    {
      key: 'ejecutado',
      header: 'Ejecutado',
      align: 'right',
      render: (item) => formatCurrency(item.actual),
    },
    {
      key: 'responsable',
      header: 'Responsable',
      render: (item) => item.owner,
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
        </div>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Administración · Reportes"
        title="Costos y reportes"
        subtitle="Comparativa visual entre presupuesto y ejecución por categoría. Cifras ficticias de la maqueta; no se calculan costos reales."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nuevo registro
          </Button>
        }
      />

      <div className="metric-grid">
        <MetricCard
          label="Presupuesto visible"
          value={compactCurrency(totalBudget)}
          icon={<Wallet size={17} aria-hidden="true" />}
          foot={<span>Suma de registros simulados</span>}
        />
        <MetricCard
          label="Valor ejecutado"
          value={compactCurrency(totalActual)}
          tone="secondary"
          icon={<BarChart3 size={17} aria-hidden="true" />}
          foot={<span>Suma de registros simulados</span>}
        />
        <MetricCard
          label={variance >= 0 ? 'Disponible' : 'Sobreejecución'}
          value={compactCurrency(Math.abs(variance))}
          tone={variance >= 0 ? 'primary' : 'error'}
          icon={<AlertTriangle size={17} aria-hidden="true" />}
          foot={<span>Comparación simple, sin reglas de negocio</span>}
        />
        <MetricCard
          label="Registros"
          value={String(costs.length)}
          tone="info"
          icon={<BarChart3 size={17} aria-hidden="true" />}
          foot={<span>Periodos visibles en la maqueta</span>}
        />
      </div>

      <Card
        title="Ejecución por categoría"
        meta="Porcentaje del presupuesto ejecutado (cálculo simple)"
      >
        <div className="chart-bars">
          {byCategory.map((group) => {
            const percent =
              group.budget === 0 ? 0 : Math.round((group.actual / group.budget) * 100);
            return (
              <div className="chart-bar" key={group.name}>
                <span className="chart-bar__label">{group.name}</span>
                <div
                  className="chart-bar__track"
                  role="img"
                  aria-label={`${group.name}: ${percent}% ejecutado`}
                >
                  <div
                    className={`chart-bar__fill ${percent > 100 ? 'chart-bar__fill--warning' : ''}`.trim()}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <span className="chart-bar__value">{percent}%</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="toolbar">
        <div className="toolbar__group">
          <div className="toolbar__search">
            <Input
              type="search"
              placeholder="Buscar registro o periodo…"
              aria-label="Buscar costos"
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
              title="Sin registros de costos"
              description="Ajustá los filtros o agregá un registro simulado."
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
        title={editing ? `Editar ${editing.code}` : 'Nuevo registro de costos'}
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
          <FormField label="Código" htmlFor="cj-code" required error={errors.code?.message}>
            <Input id="cj-code" {...register('code')} invalid={Boolean(errors.code)} />
          </FormField>
          <FormField
            label="Periodo (AAAA-MM)"
            htmlFor="cj-period"
            required
            error={errors.period?.message}
          >
            <Input
              id="cj-period"
              placeholder="2026-11"
              {...register('period')}
              invalid={Boolean(errors.period)}
            />
          </FormField>
          <FormField label="Concepto" htmlFor="cj-concept" required error={errors.concept?.message}>
            <Input id="cj-concept" {...register('concept')} invalid={Boolean(errors.concept)} />
          </FormField>
          <FormField
            label="Categoría"
            htmlFor="cj-category"
            required
            error={errors.category?.message}
          >
            <Input id="cj-category" {...register('category')} invalid={Boolean(errors.category)} />
          </FormField>
          <FormField label="Presupuesto" htmlFor="cj-budget" error={errors.budget?.message}>
            <Input
              id="cj-budget"
              type="number"
              min={0}
              {...register('budget')}
              invalid={Boolean(errors.budget)}
            />
          </FormField>
          <FormField label="Valor ejecutado" htmlFor="cj-actual" error={errors.actual?.message}>
            <Input
              id="cj-actual"
              type="number"
              min={0}
              {...register('actual')}
              invalid={Boolean(errors.actual)}
            />
          </FormField>
          <FormField label="Responsable" htmlFor="cj-owner" required error={errors.owner?.message}>
            <Input id="cj-owner" {...register('owner')} invalid={Boolean(errors.owner)} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.concept}` : 'Detalle'}
        subtitle="Consulta simulada de costos"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {detail ? (
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item__label">Periodo</span>
              <span className="detail-item__value">{detail.period}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Categoría</span>
              <span className="detail-item__value">{detail.category}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Presupuesto</span>
              <span className="detail-item__value">{formatCurrency(detail.budget)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Ejecutado</span>
              <span className="detail-item__value">{formatCurrency(detail.actual)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Responsable</span>
              <span className="detail-item__value">{detail.owner}</span>
            </div>
            <div className="detail-item">
              <span className="detail-item__label">Estado</span>
              <span className="detail-item__value">
                <StatusBadge status={detail.status} />
              </span>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
