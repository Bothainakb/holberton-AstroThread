/** The bookmark icon (same shape as icons/thread/bookmark.svg), filled once saved. */
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="18" viewBox="-1 -1 12 18" aria-hidden="true">
      <path
        d="M0 0H10V16L5 12.4L0 16Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default BookmarkIcon
