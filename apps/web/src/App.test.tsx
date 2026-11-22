import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const healthPayload = {
  status: 'ok',
  checks: { database: 'up', redis: 'up' },
  version: '0.1.0',
  uptimeSeconds: 1,
};

describe('InduInventory · shell y maqueta', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => healthPayload,
      }),
    );
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra la identidad GRIS VERDE, el dashboard y el estado real de la API', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard general' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('GRIS VERDE').length).toBeGreaterThan(0);
    expect(screen.getByText('InduInventory')).toBeInTheDocument();
    expect(screen.getByText('Maqueta · datos simulados')).toBeInTheDocument();
    expect(await screen.findByText(/API conectada/)).toBeInTheDocument();
  });

  it('navega a maquinaria y abre una hoja de vida simulada', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('link', { name: /Maquinaria y hojas de vida/ }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Maquinaria y hojas de vida' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Ver MQ-001' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver MQ-001' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('SG-191K-88421')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('valida el formulario de repuestos antes de aceptar una operación simulada', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('link', { name: 'Repuestos' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Repuestos' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Nuevo repuesto/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Guardar \(simulado\)/ }));

    expect(await within(dialog).findByText('El código es obligatorio.')).toBeInTheDocument();
  });
});
