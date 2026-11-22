import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden="true">
        <Inbox size={22} />
      </span>
      <strong className="empty-state__title">{title}</strong>
      <p className="empty-state__description">{description}</p>
      {action ? <div className="page__actions">{action}</div> : null}
    </div>
  );
}
