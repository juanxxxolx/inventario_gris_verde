import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDemo } from '../../lib/demo/store';
import type { Toast } from '../../lib/demo/types';

const icons: Record<Toast['tone'], ReactNode> = {
  success: <CheckCircle2 size={17} aria-hidden="true" />,
  info: <Info size={17} aria-hidden="true" />,
  warning: <AlertTriangle size={17} aria-hidden="true" />,
  error: <AlertTriangle size={17} aria-hidden="true" />,
};

export function Toaster() {
  const { toasts, dismissToast } = useDemo();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-region" role="region" aria-label="Notificaciones de la maqueta">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
          <span aria-hidden="true">{icons[toast.tone]}</span>
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Descartar notificación"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
