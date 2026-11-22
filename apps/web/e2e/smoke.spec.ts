import { expect, test, type Page } from '@playwright/test';

const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  consoleErrors.set(page, errors);
});

test.afterEach(async ({ page }) => {
  const errors = consoleErrors.get(page) ?? [];
  expect(errors, `Errores de consola: ${errors.join(' | ')}`).toEqual([]);
});

test('el dashboard muestra la identidad GRIS VERDE y el estado real de la API', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard general' })).toBeVisible();
  await expect(page.getByText('GRIS VERDE').first()).toBeVisible();
  await expect(page.getByText('InduInventory', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Maqueta · datos simulados')).toBeVisible();
  await expect(page.getByText(/API conectada/)).toBeVisible();
});

test('la navegación lateral abre los ocho módulos de la maqueta', async ({ page }) => {
  await page.goto('/');

  const modules = [
    { link: 'Dashboard', heading: 'Dashboard general' },
    { link: 'Maquinaria y hojas de vida', heading: 'Maquinaria y hojas de vida' },
    { link: 'Repuestos', heading: 'Repuestos' },
    { link: 'Solicitudes y entregas', heading: 'Solicitudes y entregas' },
    { link: 'Inventario de agujas', heading: 'Inventario de agujas' },
    { link: 'Mantenimiento', heading: 'Mantenimiento' },
    { link: 'Costos y reportes', heading: 'Costos y reportes' },
    { link: 'Usuarios y configuración', heading: 'Usuarios y configuración' },
  ];

  for (const module of modules) {
    await page.getByRole('link', { name: new RegExp(`^${module.link}`) }).click();
    await expect(page.getByRole('heading', { level: 1, name: module.heading })).toBeVisible();
  }
});

test('los modales y las validaciones funcionan en la maqueta', async ({ page }) => {
  await page.goto('/maquinaria');

  await page.getByRole('button', { name: 'Ver MQ-001' }).click();
  const detailDialog = page.getByRole('dialog');
  await expect(detailDialog).toBeVisible();
  await expect(detailDialog.getByText('SG-191K-88421')).toBeVisible();
  await detailDialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(detailDialog).toBeHidden();

  await page.getByRole('link', { name: 'Repuestos', exact: true }).click();
  await page.getByRole('button', { name: /Nuevo repuesto/ }).click();
  const formDialog = page.getByRole('dialog');
  await formDialog.getByRole('button', { name: /Guardar \(simulado\)/ }).click();
  await expect(formDialog.getByText('El código es obligatorio.')).toBeVisible();
});

test('las rutas principales no desbordan horizontalmente', async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard general' })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow, `desbordamiento horizontal a ${width}px`).toBe(false);
  }
});
