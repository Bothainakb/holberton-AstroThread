import type { ReactNode } from 'react'
import './Tag.css'

interface TagProps {
  children: ReactNode
  href?: string
  /** Renders the tag as a toggle button; `pressed` marks it as selected. */
  onClick?: () => void
  pressed?: boolean
  className?: string
}

/** Figma "Research Tag": a pill used for categories and topics. */
function Tag({ children, href, onClick, pressed = false, className }: TagProps) {
  const classes = ['tag', className].filter(Boolean).join(' ')

  if (onClick) {
    return (
      <button
        type="button"
        className={`${classes} tag--link tag--button${pressed ? ' tag--pressed' : ''}`}
        aria-pressed={pressed}
        onClick={onClick}
      >
        {children}
      </button>
    )
  }

  if (href) {
    return (
      <a className={`${classes} tag--link`} href={href}>
        {children}
      </a>
    )
  }

  return <span className={classes}>{children}</span>
}

export default Tag
