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

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
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
        className="pagination__button pagination__step"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <Chevron direction="left" />
        Previous
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
        className="pagination__button pagination__step"
        disabled={currentPage === pageCount}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
        <Chevron direction="right" />
      </button>
    </nav>
  );
}