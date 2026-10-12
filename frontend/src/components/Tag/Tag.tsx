import type { ReactNode } from 'react'
import './Tag.css'

interface TagProps {
  children: ReactNode
  href?: string
  className?: string
}

/** Figma "Research Tag": a pill used for categories and topics. */
function Tag({ children, href, className }: TagProps) {
  const classes = ['tag', className].filter(Boolean).join(' ')

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
