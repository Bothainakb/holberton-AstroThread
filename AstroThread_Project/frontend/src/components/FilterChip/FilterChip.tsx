import type { ReactNode } from 'react'
import './FilterChip.css'

interface FilterChipProps {
  active?: boolean
  onClick?: () => void
  children: ReactNode
}

/** Pill-shaped toggle used for topic filters on the Research Threads page. */
function FilterChip({ active = false, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`filter-chip${active ? ' filter-chip--active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default FilterChip
