import type { ReactNode } from 'react';

export type MetricTone = 'primary' | 'warning' | 'error' | 'info' | 'secondary';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: MetricTone;
  foot?: ReactNode;
}

export function MetricCard({ label, value, icon, tone = 'primary', foot }: MetricCardProps) {
  return (
    <article className={`metric-card${tone === 'primary' ? '' : ` metric-card--${tone}`}`}>
      <div className="metric-card__header">
        <span className="metric-card__label">{label}</span>
        <span className="metric-card__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      {foot ? <div className="metric-card__foot">{foot}</div> : null}
    </article>
  );
}
