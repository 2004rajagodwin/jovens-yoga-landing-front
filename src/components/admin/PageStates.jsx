export function TableSkeleton({ rows = 6 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="jy-skeleton jy-skeleton-row" />
      ))}
    </div>
  );
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div className="jy-kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="jy-skeleton jy-skeleton-card" />
      ))}
    </div>
  );
}

export function EmptyState({ icon = "bi-inbox", title, description }) {
  return (
    <div className="jy-state">
      <i className={`bi ${icon}`}></i>
      <p className="jy-state-title">{title}</p>
      {description && <p className="jy-state-desc">{description}</p>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="jy-state jy-state-error">
      <i className="bi bi-exclamation-triangle-fill"></i>
      <p className="jy-state-title">{message}</p>
      {onRetry && (
        <button type="button" className="jy-btn jy-btn-outline jy-btn-sm" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise"></i> Retry
        </button>
      )}
    </div>
  );
}
