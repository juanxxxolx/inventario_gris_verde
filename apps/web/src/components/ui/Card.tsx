import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  meta?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
  children: ReactNode;
  className?: string;
}

export function Card({
  title,
  meta,
  actions,
  footer,
  flush = false,
  children,
  className = '',
}: CardProps) {
  return (
    <section className={`card ${className}`.trim()}>
      {title ? (
        <header className="card__header">
          <div>
            <h2 className="card__title">{title}</h2>
            {meta ? <p className="card__meta">{meta}</p> : null}
          </div>
          {actions ? <div className="page__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? 'card__body card__body--flush' : 'card__body'}>{children}</div>
      {footer ? <footer className="card__footer">{footer}</footer> : null}
    </section>
  );
}
