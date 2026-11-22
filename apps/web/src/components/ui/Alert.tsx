import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export type AlertTone = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  tone?: AlertTone;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

const icons: Record<AlertTone, ReactNode> = {
  info: <Info size={18} aria-hidden="true" />,
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  error: <XCircle size={18} aria-hidden="true" />,
};

export function Alert({ tone = 'info', title, children, action }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="alert__icon">{icons[tone]}</span>
      <div className="alert__content">
        <strong className="alert__title">{title}</strong>
        <div className="alert__message">{children}</div>
      </div>
      {action ? <div className="alert__action">{action}</div> : null}
    </div>
  );
}
