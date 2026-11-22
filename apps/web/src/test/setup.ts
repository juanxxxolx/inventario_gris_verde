import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest no usa globals aquí, así que la limpieza automática de Testing Library no se registra.
afterEach(() => {
  cleanup();
});

// jsdom no implementa scrollTo; TanStack Router lo invoca al navegar.
window.scrollTo = () => {};
