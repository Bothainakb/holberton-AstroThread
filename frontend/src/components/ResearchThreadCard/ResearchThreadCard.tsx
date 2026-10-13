import type { ResearchThread } from '../../data/threads'
import Link from '../../router/Link'
import { threadDetailsPath } from '../../router/router'
import Tag from '../Tag/Tag'
import './ResearchThreadCard.css'

/**
 * Threads from the API only have the core fields; paper count, stages and the
 * updated label are shown when available.
 */
export type ResearchThreadCardData = Pick<ResearchThread, 'id' | 'title' | 'category' | 'description'> &
  Partial<Pick<ResearchThread, 'paperCount' | 'completedStages' | 'totalStages' | 'updatedLabel'>>

interface ResearchThreadCardProps {
  thread: ResearchThreadCardData
}

function ResearchThreadCard({ thread }: ResearchThreadCardProps) {
  const { completedStages, totalStages } = thread
  const hasStages = completedStages !== undefined && totalStages !== undefined
  const stages = hasStages
    ? Array.from({ length: totalStages }, (_, index) => index < completedStages)
    : []

  return (
    <article className="thread-card">
      <div className="thread-card__meta">
        <Tag>{thread.category}</Tag>
        {thread.paperCount !== undefined && (
          <span className="thread-card__muted">{thread.paperCount} papers</span>
        )}
      </div>

      <h3 className="thread-card__title">{thread.title}</h3>
      <p className="thread-card__description">{thread.description}</p>

      {hasStages && (
        <div className="thread-card__progress">
          <div className="thread-card__progress-label">
            <span>Research stages</span>
            <span className="thread-card__progress-count">
              {completedStages} / {totalStages}
            </span>
          </div>
          <div
            className="thread-card__stages"
            role="progressbar"
            aria-label={`${thread.title} research stages`}
            aria-valuemin={0}
            aria-valuemax={totalStages}
            aria-valuenow={completedStages}
          >
            {stages.map((isComplete, index) => (
              <span
                key={index}
                className={`thread-card__stage${isComplete ? ' thread-card__stage--complete' : ''}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="thread-card__footer">
        <Link className="thread-card__link" href={threadDetailsPath(thread.id)}>
          Explore Thread
          <svg width="10.5" height="9" viewBox="0 0 10.5 9" fill="none" aria-hidden="true">
            <path
              d="M0.75 4.5H9.75M6 0.75L9.75 4.5L6 8.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        {thread.updatedLabel && <span className="thread-card__muted">{thread.updatedLabel}</span>}
      </div>
    </article>
  )
}

export default ResearchThreadCard
