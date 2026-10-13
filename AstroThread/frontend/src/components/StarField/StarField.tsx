import type { CSSProperties } from 'react'
import {
  FIGMA_CANVAS,
  backgroundStars,
  twinkleStars,
  type Star,
  type StarCanvas,
} from '../../data/stars'
import './StarField.css'

// Stars smaller than this are drawn as glowing dots, larger ones as sparkles.
const SPARKLE_MIN_SIZE = 11

interface StarFieldProps {
  stars?: Star[]
  twinkles?: Star[]
  canvas?: StarCanvas
  /** Background glow layout; each Figma frame has its own nebula. */
  glow?: 'home' | 'research-threads' | 'thread-details' | 'login'
}

function positionStyle(star: Star, canvas: StarCanvas, extra?: CSSProperties): CSSProperties {
  const style: CSSProperties & Record<string, string | number> = {
    left: `${(star.x / canvas.width) * 100}%`,
    top: `${(star.y / canvas.height) * 100}%`,
    width: star.size,
    height: star.size,
    ...extra,
  }
  if (star.color) style['--star-color'] = star.color
  if (star.opacity !== undefined) style['--star-opacity'] = star.opacity
  return style
}

function Sparkle({ className, style }: { className: string; style: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" />
    </svg>
  )
}

/** Decorative space background: nebula glows, static stars and twinkling stars. */
function StarField({
  stars = backgroundStars,
  twinkles = twinkleStars,
  canvas = FIGMA_CANVAS,
  glow = 'home',
}: StarFieldProps) {
  return (
    <div className={`star-field star-field--glow-${glow}`} aria-hidden="true">
      {stars.map((star, index) =>
        star.size >= SPARKLE_MIN_SIZE ? (
          <Sparkle
            key={index}
            className={`star-field__sparkle star-field--${star.tone}`}
            style={positionStyle(star, canvas)}
          />
        ) : (
          <span
            key={index}
            className={`star-field__dot star-field--${star.tone}`}
            style={positionStyle(star, canvas)}
          />
        ),
      )}

      {twinkles.map((star, index) => (
        <Sparkle
          key={`twinkle-${index}`}
          className={`star-field__sparkle star-field__twinkle star-field--${star.tone}`}
          style={positionStyle(star, canvas, { animationDelay: `${(index * 0.37) % 3}s` })}
        />
      ))}
    </div>
  )
}

export default StarField
