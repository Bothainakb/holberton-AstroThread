interface StageNavigationProps {
  stageNumber: number
  stageTitles: string[]
  onChange: (stageNumber: number) => void
}

function stageLabel(number: number, title: string) {
  return `${String(number).padStart(2, '0')} ${title}`
}

/** Previous / next stage controls at the bottom of the page. */
function StageNavigation({ stageNumber, stageTitles, onChange }: StageNavigationProps) {
  const total = stageTitles.length
  const isFirst = stageNumber <= 1
  const isLast = stageNumber >= total

  return (
    <nav className="details-stage-nav container" aria-label="Stage navigation">
      <div className="details-stage-nav__inner">
        <div className="details-stage-nav__side">
          <button
            type="button"
            className="button button--secondary details-stage-nav__button"
            disabled={isFirst}
            onClick={() => onChange(stageNumber - 1)}
          >
            ← Previous Stage
          </button>
          <span className={`details-stage-nav__note${isFirst ? ' details-stage-nav__note--muted' : ''}`}>
            {isFirst ? 'You are at the first stage' : stageLabel(stageNumber - 1, stageTitles[stageNumber - 2])}
          </span>
        </div>

        <p className="details-stage-nav__current">
          Stage {stageNumber} of {total} · {stageTitles[stageNumber - 1]}
        </p>

        <div className="details-stage-nav__side details-stage-nav__side--next">
          <button
            type="button"
            className="button button--primary details-stage-nav__button"
            disabled={isLast}
            onClick={() => onChange(stageNumber + 1)}
          >
            Next Stage →
          </button>
          <span className={`details-stage-nav__note${isLast ? ' details-stage-nav__note--muted' : ''}`}>
            {isLast ? 'You are at the last stage' : stageLabel(stageNumber + 1, stageTitles[stageNumber])}
          </span>
        </div>
      </div>
    </nav>
  )
}

export default StageNavigation
