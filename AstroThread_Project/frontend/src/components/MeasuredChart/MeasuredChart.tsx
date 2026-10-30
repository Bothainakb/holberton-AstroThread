import {
  axisTitle,
  niceTicks,
  yearTicks,
  type MeasuredChartData,
  type MeasuredPoint,
} from '../../services/chartData'
import '../DataChart/DataChart.css'
import './MeasuredChart.css'

// Plot area in SVG units; the SVG scales to the card's width.
const WIDTH = 640
const HEIGHT = 300
const MARGIN = { top: 16, right: 12, bottom: 58, left: 64 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

function formatYear(x: number) {
  return Number.isInteger(x) ? String(x) : x.toFixed(2)
}

/** Name of a point in tooltips and the data table. */
function pointName(chart: MeasuredChartData, point: MeasuredPoint) {
  if (chart.x.kind === 'category') {
    return point.sublabel ? `${point.label} (${point.sublabel})` : (point.label ?? '')
  }
  const year = formatYear(point.x ?? 0)
  return point.label ? `${point.label}, ${year}` : year
}

function valueText(chart: MeasuredChartData, value: number) {
  return chart.y.unit ? `${numberFormat.format(value)} ${chart.y.unit}` : numberFormat.format(value)
}

/**
 * A chart of measured data from chart_data (migration 006): labelled axes with
 * units, the values on a true scale and the source it came from.
 */
function MeasuredChart({ chart, className }: { chart: MeasuredChartData; className?: string }) {
  const { points } = chart
  const categories = chart.x.kind === 'category'
  const yTicks = niceTicks(Math.max(...points.map((point) => point.y)))
  const yMax = yTicks[yTicks.length - 1]
  const yOf = (value: number) => MARGIN.top + PLOT_HEIGHT * (1 - value / yMax)

  // Categories get equal bands; years are placed on a true time scale.
  const xs = points.map((point) => point.x ?? 0)
  const pad = chart.type === 'bar' ? 0.5 : 0.25
  const xMin = categories ? 0 : Math.min(...xs) - pad
  const xMax = categories ? points.length : Math.max(...xs) + pad
  const band = categories ? PLOT_WIDTH / points.length : PLOT_WIDTH / (xMax - xMin)
  const xOf = (point: MeasuredPoint, index: number) =>
    categories
      ? MARGIN.left + band * (index + 0.5)
      : MARGIN.left + ((point.x ?? 0) - xMin) * band
  const barWidth = Math.max(2, Math.min(band * (categories ? 0.56 : 0.72), 64))
  const xTicks = categories ? [] : yearTicks(xMin, xMax)
  const baseline = yOf(0)

  const summary = `${chart.title}. ${axisTitle(chart.y)} against ${axisTitle(chart.x).toLowerCase()}, ${points.length} values. Source: ${chart.source.name}.`

  return (
    <figure className={['data-chart', 'measured-chart', className].filter(Boolean).join(' ')}>
      <figcaption className="measured-chart__header">
        <span className="data-chart__title">{chart.title}</span>
        <span className="measured-chart__units">
          {axisTitle(chart.y)} · {axisTitle(chart.x)}
        </span>
      </figcaption>

      <svg
        className="measured-chart__plot"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={summary}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              className="measured-chart__grid"
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yOf(tick)}
              y2={yOf(tick)}
            />
            <text className="measured-chart__tick" x={MARGIN.left - 8} y={yOf(tick)} textAnchor="end" dominantBaseline="middle">
              {numberFormat.format(tick)}
            </text>
          </g>
        ))}

        <line className="measured-chart__axis" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={baseline} y2={baseline} />

        {xTicks.map((tick) => {
          const x = MARGIN.left + (tick - xMin) * band
          return (
            <g key={tick}>
              <line className="measured-chart__axis" x1={x} x2={x} y1={baseline} y2={baseline + 5} />
              <text className="measured-chart__tick" x={x} y={baseline + 20} textAnchor="middle">
                {tick}
              </text>
            </g>
          )
        })}

        {chart.type === 'line' && (
          <path
            className="measured-chart__line"
            d={points.map((point, index) => `${index === 0 ? 'M' : 'L'}${xOf(point, index)} ${yOf(point.y)}`).join(' ')}
          />
        )}

        {points.map((point, index) => {
          const x = xOf(point, index)
          const y = yOf(point.y)
          const tooltip = `${pointName(chart, point)}: ${valueText(chart, point.y)}`
          if (chart.type === 'bar') {
            return (
              <g key={`${point.label ?? ''}-${point.x ?? index}`}>
                <rect
                  className="measured-chart__bar"
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={Math.max(baseline - y, 0)}
                  rx={2}
                >
                  <title>{tooltip}</title>
                </rect>
                {categories && (
                  <>
                    <text className="measured-chart__value" x={x} y={y - 6} textAnchor="middle">
                      {numberFormat.format(point.y)}
                    </text>
                    <text className="measured-chart__tick measured-chart__category" x={x} y={baseline + 20} textAnchor="middle">
                      {point.label}
                    </text>
                    {point.sublabel && (
                      <text className="measured-chart__tick" x={x} y={baseline + 36} textAnchor="middle">
                        {point.sublabel}
                      </text>
                    )}
                  </>
                )}
              </g>
            )
          }
          return (
            <circle
              key={`${point.label ?? ''}-${point.x ?? index}`}
              className={chart.type === 'scatter' ? 'measured-chart__dot' : 'measured-chart__point'}
              cx={x}
              cy={y}
              r={chart.type === 'scatter' ? 3.5 : 5}
            >
              <title>{tooltip}</title>
            </circle>
          )
        })}

        <text
          className="measured-chart__axis-title"
          transform={`translate(16 ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          {axisTitle(chart.y)}
        </text>
        <text
          className="measured-chart__axis-title"
          x={MARGIN.left + PLOT_WIDTH / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
        >
          {axisTitle(chart.x)}
        </text>
      </svg>

      {chart.note && <p className="measured-chart__note">{chart.note}</p>}
      <p className="measured-chart__source">
        Source:{' '}
        <a href={chart.source.url} target="_blank" rel="noopener noreferrer">
          {chart.source.name}
        </a>
        , retrieved {chart.source.retrieved}.{chart.source.detail ? ` ${chart.source.detail}` : ''}
      </p>

      <table className="visually-hidden">
        <caption>{chart.title}</caption>
        <thead>
          <tr>
            <th scope="col">{axisTitle(chart.x)}</th>
            <th scope="col">{axisTitle(chart.y)}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => (
            <tr key={`${point.label ?? ''}-${point.x ?? index}`}>
              <td>{pointName(chart, point)}</td>
              <td>{numberFormat.format(point.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export default MeasuredChart
