import type { ReactNode } from 'react'
import './PlaceholderPanel.css'

interface PlaceholderPanelProps {
  title: string
  children: ReactNode
  className?: string
}

/** Clearly labeled stand-in for content that is not available yet. */
function PlaceholderPanel({ title, children, className }: PlaceholderPanelProps) {
  return (
    <div className={['placeholder-panel', className].filter(Boolean).join(' ')} role="note">
      <span className="placeholder-panel__label">Not available yet</span>
      <p className="placeholder-panel__title">{title}</p>
      <p className="placeholder-panel__text">{children}</p>
    </div>
  )
}

export default PlaceholderPanel
