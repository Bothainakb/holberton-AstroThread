import type { ReactNode } from 'react'
import './SectionHeader.css'

interface SectionHeaderProps {
  id?: string
  title: string
  subtitle: string
  action?: ReactNode
}

function SectionHeader({ id, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-header__title" id={id}>
          {title}
        </h2>
        <p className="section-header__subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

export default SectionHeader
