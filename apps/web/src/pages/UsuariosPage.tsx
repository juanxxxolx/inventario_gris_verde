import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Pencil, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
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
import { useDemo } from '../lib/demo/store';
import type { DemoUser } from '../lib/demo/types';

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.'),
  email: z.email('Ingrese un correo válido.'),
  role: z.enum(['Administrador', 'Operador', 'Supervisor', 'Consulta']),
  area: z.string().trim().min(1, 'El área es obligatoria.'),
  lastAccess: z.string(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = {
  name: '',
  email: '',
  role: 'Operador',
  area: '',
  lastAccess: 'Sin acceso registrado',
};

const PAGE_SIZE = 6;

export function UsuariosPage() {
  const { users, saveUser, setUserStatus, pushToast } = useDemo();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<DemoUser | null>(null);
  const [editing, setEditing] = useState<DemoUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [preferences, setPreferences] = useState({ notificaciones: true, compacto: false });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch =
        term.length === 0 ||
        `${item.name} ${item.email} ${item.area} ${item.role}`.toLowerCase().includes(term);
      return matchesSearch && (roleFilter === 'all' || item.role === roleFilter);
    });
  }, [users, search, roleFilter]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (item: DemoUser) => {
    setEditing(item);
    reset({
      name: item.name,
      email: item.email,
      role: item.role,
      area: item.area,
      lastAccess: item.lastAccess,
    });
    setFormOpen(true);
  };

  const onSubmit = (values: FormValues) => {
    const common = { ...values, status: editing?.status ?? STATUS.active };
    saveUser(editing ? { ...common, id: editing.id } : common);
    setFormOpen(false);
  };

  const columns: ReadonlyArray<Column<DemoUser>> = [
    {
      key: 'usuario',
      header: 'Usuario',
      render: (item) => (
        <>
          <span className="table__primary">{item.name}</span>
          <span className="table__secondary">{item.email}</span>
        </>
      ),
    },
    { key: 'rol', header: 'Rol', render: (item) => item.role },
    { key: 'area', header: 'Área', render: (item) => item.area },
    { key: 'acceso', header: 'Último acceso', render: (item) => item.lastAccess },
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
            aria-label={`Ver ${item.name}`}
          >
            <Eye size={15} aria-hidden="true" /> Ver
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openEdit(item)}
            aria-label={`Editar ${item.name}`}
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
        eyebrow="Administración · Accesos"
        title="Usuarios y configuración"
        subtitle="Cuentas, roles y preferencias de la maqueta. Los permisos reales deben validarse siempre en el servidor."
        actions={
          <Button onClick={openCreate}>
            <span aria-hidden="true">+</span> Nuevo usuario
          </Button>
        }
      />

      <Alert tone="info" title="Sin contraseñas ni secretos en la maqueta">
        No se registran credenciales. Este formulario solo demuestra la estructura visual y las
        validaciones del alta de usuarios.
      </Alert>

      <div className="split-grid">
        <div className="stack">
          <div className="toolbar">
            <div className="toolbar__group">
              <div className="toolbar__search">
                <Input
                  type="search"
                  placeholder="Buscar usuario o área…"
                  aria-label="Buscar usuarios"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                aria-label="Filtrar por rol"
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Todos los roles' },
                  ...['Administrador', 'Operador', 'Supervisor', 'Consulta'].map((role) => ({
                    value: role,
                    label: role,
                  })),
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
                  title="Sin usuarios visibles"
                  description="Ajustá los filtros o registrá un usuario simulado."
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
        </div>

        <Card title="Preferencias de la maqueta" meta="Solo demostración visual">
          <div className="stack">
            <label className="user-chip" htmlFor="pref-notifications">
              <input
                id="pref-notifications"
                type="checkbox"
                checked={preferences.notificaciones}
                onChange={(event) => {
                  setPreferences((prev) => ({ ...prev, notificaciones: event.target.checked }));
                  pushToast('Preferencia actualizada solo en la maqueta.', 'info');
                }}
              />
              Notificaciones visuales
            </label>
            <label className="user-chip" htmlFor="pref-compact">
              <input
                id="pref-compact"
                type="checkbox"
                checked={preferences.compacto}
                onChange={(event) => {
                  setPreferences((prev) => ({ ...prev, compacto: event.target.checked }));
                  pushToast('Preferencia actualizada solo en la maqueta.', 'info');
                }}
              />
              Vista compacta (pendiente de diseño)
            </label>
            <Alert tone="info" title="Permisos">
              La ocultación de botones no sustituye la validación de permisos en el servidor.
            </Alert>
          </div>
        </Card>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Editar ${editing.name}` : 'Nuevo usuario'}
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
          <FormField
            label="Nombre completo"
            htmlFor="us-name"
            required
            error={errors.name?.message}
          >
            <Input id="us-name" {...register('name')} invalid={Boolean(errors.name)} />
          </FormField>
          <FormField
            label="Correo corporativo"
            htmlFor="us-email"
            required
            error={errors.email?.message}
          >
            <Input
              id="us-email"
              type="email"
              {...register('email')}
              invalid={Boolean(errors.email)}
            />
          </FormField>
          <FormField label="Rol" htmlFor="us-role" error={errors.role?.message}>
            <Select
              id="us-role"
              options={[
                { value: 'Administrador', label: 'Administrador' },
                { value: 'Operador', label: 'Operador' },
                { value: 'Supervisor', label: 'Supervisor' },
                { value: 'Consulta', label: 'Consulta' },
              ]}
              {...register('role')}
            />
          </FormField>
          <FormField label="Área" htmlFor="us-area" required error={errors.area?.message}>
            <Input id="us-area" {...register('area')} invalid={Boolean(errors.area)} />
          </FormField>
          <FormField label="Último acceso" htmlFor="us-access">
            <Input id="us-access" {...register('lastAccess')} />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? detail.name : 'Detalle'}
        subtitle="Consulta simulada de usuario"
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
                <span className="detail-item__label">Correo</span>
                <span className="detail-item__value">{detail.email}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Rol</span>
                <span className="detail-item__value">{detail.role}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Área</span>
                <span className="detail-item__value">{detail.area}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item__label">Último acceso</span>
                <span className="detail-item__value">{detail.lastAccess}</span>
              </div>
            </div>
            <FormField label="Estado visible (simulado)" htmlFor="us-detail-status">
              <Select
                id="us-detail-status"
                value={
                  STATUS_OPTIONS.find((option) => option.label === detail.status.label)?.value ??
                  'active'
                }
                options={STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) => {
                  const option = STATUS_OPTIONS.find((item) => item.value === event.target.value);
                  if (option) {
                    setUserStatus(detail.id, option.status);
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

      <div className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Control de acceso</h2>
            <p className="card__meta">Preparado para conexión futura con el backend</p>
          </div>
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div className="card__body">
          <p className="section-description">
            Los roles mostrados son datos de ejemplo. Cuando se conecte el backend, los permisos
            deberán comprobarse en cada endpoint sensible y las operaciones críticas quedar
            registradas.
          </p>
        </div>
      </div>
    </div>
  );
}
