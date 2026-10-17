import type { ThreadStage } from '../../data/threads'
import Icon, { type IconName } from '../Icon/Icon'
import Tag from '../Tag/Tag'
import './ThreadStages.css'

interface ThreadStagesProps {
  stages: ThreadStage[]
  /** 1-based index of the stage the thread is currently in. */
  currentStage: number
  /** Show an icon in each marker instead of the stage number. */
  icons?: IconName[]
  /** Makes each step a button that selects that stage. */
  onSelect?: (stageNumber: number) => void
  className?: string
}

type StageState = 'complete' | 'current' | 'upcoming'

function stageState(stageNumber: number, currentStage: number): StageState {
  if (stageNumber < currentStage) return 'complete'
  if (stageNumber === currentStage) return 'current'
  return 'upcoming'
}

/** Five-step progress view from Figma's "How a thread unfolds" section. */
function ThreadStages({ stages, currentStage, icons, onSelect, className }: ThreadStagesProps) {
  return (
    <ol className={['thread-stages', className].filter(Boolean).join(' ')}>
      {stages.map((stage, index) => {
        const number = index + 1
        const state = stageState(number, currentStage)
        const icon = icons?.[index]

        const content = (
          <>
            <span className="thread-stages__index">{String(number).padStart(2, '0')}</span>
            <span className="thread-stages__marker" aria-hidden="true">
              {icon ? <Icon name={icon} /> : number}
            </span>
            <span className="thread-stages__title">{stage.title}</span>
            <span className="thread-stages__description">{stage.description}</span>
            {state === 'current' && <Tag className="thread-stages__badge">Current stage</Tag>}
          </>
        )

        return (
          <li
            key={stage.title}
            className={`thread-stages__item thread-stages__item--${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            {onSelect ? (
              <button
                type="button"
                className="thread-stages__button"
                aria-label={`Stage ${number}: ${stage.title}`}
                onClick={() => onSelect(number)}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default ThreadStages
