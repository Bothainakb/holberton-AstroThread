import type { CSSProperties } from 'react'
import arrowLeft from '../../assets/icons/thread/arrow-left.svg'
import arrowRight from '../../assets/icons/thread/arrow-right.svg'
import bookmark from '../../assets/icons/thread/bookmark.svg'
import chevronRight from '../../assets/icons/thread/chevron-right.svg'
import papers from '../../assets/icons/thread/papers.svg'
import stageData from '../../assets/icons/thread/stage-data.svg'
import stageDiscoveries from '../../assets/icons/thread/stage-discoveries.svg'
import stageLatest from '../../assets/icons/thread/stage-latest.svg'
import stageOrigin from '../../assets/icons/thread/stage-origin.svg'
import stageResearch from '../../assets/icons/thread/stage-research.svg'
import stages from '../../assets/icons/thread/stages.svg'
import './Icon.css'

// Icons exported from the Figma frame "03-research-thread-details". Sizes are
// the SVG sizes, which include 1px of padding for the stroke outlines.
const icons = {
  'arrow-left': { src: arrowLeft, width: 13.67, height: 12 },
  'arrow-right': { src: arrowRight, width: 12.5, height: 11 },
  bookmark: { src: bookmark, width: 12, height: 18 },
  'chevron-right': { src: chevronRight, width: 11.33, height: 10 },
  papers: { src: papers, width: 10.25, height: 15.5 },
  stages: { src: stages, width: 14, height: 14 },
  'stage-origin': { src: stageOrigin, width: 21.5, height: 21.5 },
  'stage-research': { src: stageResearch, width: 13.92, height: 21.5 },
  'stage-discoveries': { src: stageDiscoveries, width: 18.79, height: 18.79 },
  'stage-data': { src: stageData, width: 19.33, height: 19.33 },
  'stage-latest': { src: stageLatest, width: 16.08, height: 21.5 },
} as const

export type IconName = keyof typeof icons

interface IconProps {
  name: IconName
  className?: string
}

/** Single-color icon drawn with a CSS mask, so it takes the current text color. */
function Icon({ name, className }: IconProps) {
  const icon = icons[name]
  const style = {
    '--icon-src': `url("${icon.src}")`,
    width: icon.width,
    height: icon.height,
  } as CSSProperties

  return (
    <span className={['icon', className].filter(Boolean).join(' ')} style={style} aria-hidden="true" />
  )
}

export default Icon
