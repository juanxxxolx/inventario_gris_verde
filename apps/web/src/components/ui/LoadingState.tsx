interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Cargando…' }: LoadingStateProps) {
  return (
    <div className="state state--loading" role="status">
      <span className="state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
