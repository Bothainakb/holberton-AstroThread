import type { ChartPoint } from '../../data/home'
import './DataChart.css'

/** Plot geometry in Figma pixels; each chart in the design has its own. */
export interface ChartGeometry {
  width: number
  height: number
  /** y of the highest (value 1) and lowest (value 0) points. */
  top: number
  bottom: number
  /** Horizontal distance from the plot edges to the first and last points. */
  inset: number
  pointRadius: number
  gridLines: number[]
}

// The "Group" inside the Home page's Black Hole Mass card.
const HOME_CHART: ChartGeometry = {
  width: 596.7,
  height: 180.75,
  top: 6.14,
  bottom: 180.75,
  inset: 35.1,
  pointRadius: 6.14,
  gridLines: [6.14, 50.01, 93.88, 137.75],
}

interface DataChartProps {
  title: string
  note?: string
  data: ChartPoint[]
  geometry?: ChartGeometry
  className?: string
}

/** Figma "Research Data Chart": a simple line chart drawn with SVG. */
function DataChart({ title, note, data, geometry = HOME_CHART, className }: DataChartProps) {
  const { width, height, top, bottom, inset, pointRadius, gridLines } = geometry
  const step = data.length > 1 ? (width - 2 * inset) / (data.length - 1) : 0
  const points = data.map((point, index) => ({
    ...point,
    x: inset + index * step,
    y: top + (1 - point.value) * (bottom - top),
  }))
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')

  return (
    <figure className={['data-chart', className].filter(Boolean).join(' ')}>
      <figcaption className="data-chart__header">
        <span className="data-chart__title">{title}</span>
        {note && <span className="data-chart__note">{note}</span>}
      </figcaption>

      <svg
        className="data-chart__plot"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${title}: ${data.map((point) => point.year).join(', ')}`}
      >
        {gridLines.map((y) => (
          <line key={y} className="data-chart__grid" x1={0} x2={width} y1={y} y2={y} />
        ))}
        <line
          className="data-chart__axis"
          x1={0}
          x2={width}
          y1={bottom - 0.5}
          y2={bottom - 0.5}
        />
        <path className="data-chart__line" d={linePath} />
        {points.map((point) => (
          <circle
            key={point.year}
            className="data-chart__point"
            cx={point.x}
            cy={point.y}
            r={pointRadius}
          />
        ))}
      </svg>

      <div className="data-chart__labels" aria-hidden="true">
        {points.map((point) => (
          <span key={point.year} style={{ left: `${(point.x / width) * 100}%` }}>
            {point.year}
          </span>
        ))}
      </div>
    </figure>
  )
}

export default DataChart
