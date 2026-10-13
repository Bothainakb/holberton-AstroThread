// Smooth in-page scrolling for the Thread Details page.

/** Space left between the top of the viewport (or a sticky navbar) and the section. */
const SECTION_GAP = 24

/** Height of the navbar if it stays on screen while scrolling (sticky or fixed). */
function stickyHeaderHeight() {
  const header = document.querySelector('.navbar')
  if (!header) return 0
  const { position } = getComputedStyle(header)
  return position === 'sticky' || position === 'fixed' ? header.getBoundingClientRect().height : 0
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Scrolls to the section with the given id, keeping it clear of any sticky
 * navbar, then moves keyboard focus to the section heading so keyboard and
 * screen reader users continue from there.
 */
export function scrollToSection(sectionId: string) {
  const section = document.getElementById(sectionId)
  if (!section) return

  const top = section.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight() - SECTION_GAP
  window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })

  const headingId = section.getAttribute('aria-labelledby')
  const heading = headingId ? document.getElementById(headingId) : null
  heading?.focus({ preventScroll: true })
}
