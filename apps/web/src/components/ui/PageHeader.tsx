import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page__header">
      <div>
        <span className="page__eyebrow">{eyebrow}</span>
        <h1 className="page__title">{title}</h1>
        <p className="page__subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="page__actions">{actions}</div> : null}
    </header>
  );
}
