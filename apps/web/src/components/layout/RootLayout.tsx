import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Bell, ChevronDown, CircleHelp, LogOut, Menu, Search, Settings2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NAVIGATION_GROUPS, NAVIGATION_ITEMS, navigationLabel } from '../../app/navigation';
import { useDemo } from '../../lib/demo/store';
import { ApiStatus } from '../api/ApiStatus';
import { Toaster } from '../ui/Toaster';

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const {
    notifications,
    unreadNotifications,
    markAllNotificationsRead,
    users,
    requests,
    maintenance,
    machines,
    pushToast,
  } = useDemo();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const topbarRef = useRef<HTMLDivElement>(null);

  const currentUser = users[0];
  const initials = (currentUser?.name ?? 'Usuario')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();

  useEffect(() => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
    setGlobalSearch('');
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (topbarRef.current && !topbarRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setGlobalSearch('');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setGlobalSearch('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const searchResults =
    globalSearch.trim().length === 0
      ? []
      : NAVIGATION_ITEMS.filter((item) =>
          `${item.label} ${item.description}`
            .toLowerCase()
            .includes(globalSearch.trim().toLowerCase()),
        ).slice(0, 5);

  const counts: Record<string, number | undefined> = {
    '/solicitudes': requests.filter((item) => item.status.tone === 'pending').length,
    '/mantenimiento': maintenance.filter((item) => item.status.tone === 'info').length,
    '/maquinaria': machines.filter((item) => item.status.tone === 'error').length,
  };

  const goToFirstResult = () => {
    const first = searchResults[0];
    if (first) {
      void navigate({ to: first.to });
    } else {
      pushToast('No se encontró un módulo con ese nombre.', 'info');
    }
  };

  return (
    <>
      <div className="app-shell">
        {sidebarOpen ? (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Cerrar menú de navegación"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={sidebarOpen ? 'sidebar sidebar--open' : 'sidebar'}
          aria-label="Navegación principal"
        >
          <div className="sidebar__brand">
            <span className="brand-mark" aria-hidden="true">
              GV
            </span>
            <span className="brand-copy">
              <span className="brand-copy__company">GRIS VERDE</span>
              <span className="brand-copy__product">InduInventory</span>
            </span>
            <button
              type="button"
              className="icon-button mobile-toggle"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav className="sidebar__nav">
            {NAVIGATION_GROUPS.map((group) => (
              <div key={group}>
                <p className="sidebar__label">{group}</p>
                <ul className="nav-list">
                  {NAVIGATION_ITEMS.filter((item) => item.group === group).map((item) => {
                    const active =
                      item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
                    const Icon = item.icon;
                    const count = counts[item.to];
                    return (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          className={active ? 'nav-item nav-item--active' : 'nav-item'}
                          aria-current={active ? 'page' : undefined}
                          title={item.description}
                        >
                          <span className="nav-item__icon" aria-hidden="true">
                            <Icon size={18} />
                          </span>
                          <span className="nav-item__text">{item.label}</span>
                          {count && count > 0 ? (
                            <span className="nav-item__count" aria-label={`${count} registros`}>
                              {count}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__mode">
              <CircleHelp size={16} aria-hidden="true" />
              <span>
                <strong>Modo demostración</strong>
                Datos simulados en memoria. No se guarda información real.
              </span>
            </div>
          </div>
        </aside>

        <header className="topbar" ref={topbarRef}>
          <div className="topbar__left">
            <button
              type="button"
              className="icon-button mobile-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú de navegación"
            >
              <Menu size={20} aria-hidden="true" />
            </button>
            <div className="breadcrumb">
              <span>GRIS VERDE</span>
              <span aria-hidden="true">/</span>
              <span className="breadcrumb__current">{navigationLabel(pathname)}</span>
            </div>
            <span className="demo-badge">Maqueta · datos simulados</span>
          </div>

          <div className="topbar__right">
            <div className="topbar__search">
              <Search size={16} className="topbar__search-icon" aria-hidden="true" />
              <input
                className="input"
                type="search"
                placeholder="Buscar módulo…"
                aria-label="Buscar módulo"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    goToFirstResult();
                  }
                }}
              />
              {searchResults.length > 0 ? (
                <div className="popover" role="listbox" aria-label="Resultados de búsqueda">
                  <ul className="popover__list">
                    {searchResults.map((item) => {
                      const ResultIcon = item.icon;
                      return (
                        <li key={item.to}>
                          <button
                            type="button"
                            className="popover__item"
                            onClick={() => void navigate({ to: item.to })}
                          >
                            <ResultIcon size={17} aria-hidden="true" />
                            <span>
                              <span className="popover__item-title">{item.label}</span>
                              <span className="popover__item-meta">{item.description}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="popover-anchor">
              <button
                type="button"
                className="icon-button"
                aria-label={`Notificaciones, ${unreadNotifications} sin leer`}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
              >
                <Bell size={19} aria-hidden="true" />
                {unreadNotifications > 0 ? (
                  <span className="icon-button__dot" aria-hidden="true" />
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="popover" role="dialog" aria-label="Notificaciones">
                  <div className="popover__header">
                    <div>
                      <p className="popover__title">Notificaciones</p>
                      <p className="popover__subtitle">
                        {unreadNotifications} sin leer · simuladas para la maqueta
                      </p>
                    </div>
                  </div>
                  <ul className="popover__list">
                    {notifications.map((item) => (
                      <li key={item.id}>
                        <div className="popover__item">
                          <span
                            className={`notification-dot notification-dot--${item.tone}`}
                            aria-hidden="true"
                          />
                          <span>
                            <span className="popover__item-title">{item.title}</span>
                            <span className="popover__item-meta">{item.message}</span>
                            <span className="popover__item-meta">{item.time}</span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="popover__footer">
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={markAllNotificationsRead}
                    >
                      Marcar todas como leídas
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="popover-anchor">
              <button
                type="button"
                className="user-chip"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
              >
                <span className="avatar" aria-hidden="true">
                  {initials}
                </span>
                <span className="user-chip__copy">
                  <span className="user-chip__name">{currentUser?.name ?? 'Usuario'}</span>
                  <span className="user-chip__role">{currentUser?.role ?? 'Consulta'}</span>
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {profileOpen ? (
                <div className="popover popover--user" role="dialog" aria-label="Menú del usuario">
                  <div className="popover__header">
                    <p className="popover__title">{currentUser?.name ?? 'Usuario'}</p>
                    <p className="popover__subtitle">{currentUser?.email ?? ''}</p>
                  </div>
                  <div className="popover__list">
                    <Link to="/perfil" className="popover__item">
                      <CircleHelp size={17} aria-hidden="true" />
                      <span className="popover__item-title">Mi perfil</span>
                    </Link>
                    <Link to="/usuarios" className="popover__item">
                      <Settings2 size={17} aria-hidden="true" />
                      <span className="popover__item-title">Configuración</span>
                    </Link>
                  </div>
                  <div className="popover__footer">
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() =>
                        pushToast(
                          'El cierre de sesión real estará disponible al conectar la API.',
                          'info',
                        )
                      }
                    >
                      <LogOut size={15} aria-hidden="true" />
                      Cerrar sesión (simulado)
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="main-content" id="contenido-principal">
          <Outlet />
        </main>

        <footer className="app-footer">
          <div className="footer-inner">
            <span>GRIS VERDE · InduInventory · Maqueta sin persistencia</span>
            <ApiStatus />
          </div>
        </footer>
      </div>
      <Toaster />
    </>
  );
}
