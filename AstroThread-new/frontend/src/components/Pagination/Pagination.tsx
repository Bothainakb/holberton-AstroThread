import "./Pagination.css";

interface PaginationProps {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label?: string;
}

function getVisiblePages(currentPage: number, pageCount: number) {
  const pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);

  return [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
}

export function Pagination({
  currentPage,
  pageCount,
  onPageChange,
  label = "Pages",
}: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const pages = getVisiblePages(currentPage, pageCount);

  return (
    <nav className="pagination" aria-label={label}>
      <button
        type="button"
        className="pagination__button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Prev
      </button>

      <ol className="pagination__pages">
        {pages.map((page, index) => (
          <li key={page} className="pagination__item">
            {index > 0 && page - pages[index - 1] > 1 && (
              <span className="pagination__gap" aria-hidden="true">
                …
              </span>
            )}
            <button
              type="button"
              className="pagination__button pagination__page"
              aria-current={page === currentPage ? "page" : undefined}
              aria-label={`Page ${page}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="pagination__button"
        disabled={currentPage === pageCount}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}