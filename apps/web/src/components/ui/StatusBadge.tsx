import type { DemoStatus } from '../../lib/demo/types';

interface StatusBadgeProps {
  status: DemoStatus;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${status.tone}`}>
      {showDot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {status.label}
    </span>
  );
}
