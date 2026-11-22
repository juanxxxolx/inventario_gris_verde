interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Algo salió mal',
  message = 'No fue posible completar la operación. Intentá nuevamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state state--error" role="alert">
      <strong className="state__title">{title}</strong>
      <span className="state__message">{message}</span>
      {onRetry ? (
        <button className="button button--secondary" type="button" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
