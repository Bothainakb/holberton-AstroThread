import type { TimelineEvent } from '../../data/home'
import './Timeline.css'

interface TimelineProps {
  events: TimelineEvent[]
}

/** Figma "Research Timeline": horizontal milestones joined by a line. */
function Timeline({ events }: TimelineProps) {
  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={event.year} className="timeline__item">
          <span className="timeline__point" aria-hidden="true" />
          <span className="timeline__year">{event.year}</span>
          <span className="timeline__label">{event.label}</span>
        </li>
      ))}
    </ol>
  )
}

export default Timeline
