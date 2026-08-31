export default function AdminPaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-between align-items-center mt-3 px-1">
      <button
        type="button"
        className="jy-btn jy-btn-outline jy-btn-sm"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
      >
        <i className="bi bi-chevron-left"></i> Previous
      </button>
      <span className="jy-cell-muted">
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        className="jy-btn jy-btn-outline jy-btn-sm"
        disabled={page + 1 >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next <i className="bi bi-chevron-right"></i>
      </button>
    </div>
  );
}
