// Sourced charts stored in chart_data.dataset (backend/migrations/006_seed_chart_data.sql).
// Kept free of Vite-only code (import.meta.env) so `npm test` can run it in Node.

export type MeasuredChartType = 'line' | 'bar' | 'scatter'

export interface MeasuredAxis {
  label: string
  /** Shown in parentheses after the label, e.g. "M☉" or "planets". */
  unit: string | null
}

export interface MeasuredPoint {
  /** Position on a numeric x axis (a year, or a fraction of one). */
  x?: number
  /** Name of the point: the category on a category axis, else e.g. the event. */
  label?: string
  /** Second line under a category, e.g. the years of an observing run. */
  sublabel?: string
  y: number
}

export interface MeasuredChartData {
  title: string
  type: MeasuredChartType
  note: string | null
  x: MeasuredAxis & { kind: 'year' | 'category' }
  y: MeasuredAxis
  points: MeasuredPoint[]
  source: { name: string; url: string; retrieved: string; detail: string | null }
}

const CHART_TYPES: MeasuredChartType[] = ['line', 'bar', 'scatter']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  return typeof value === 'string' ? value : undefined
}

function axis(value: unknown): MeasuredAxis | null {
  if (!isRecord(value) || typeof value.label !== 'string' || !value.label.trim()) return null
  const unit = optionalString(value.unit)
  return unit === undefined ? null : { label: value.label, unit }
}

/** An https link; anything else is never put in an href. */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function point(value: unknown, categories: boolean): MeasuredPoint | null {
  if (!isRecord(value) || typeof value.y !== 'number' || !Number.isFinite(value.y)) return null
  const label = optionalString(value.label)
  const sublabel = optionalString(value.sublabel)
  if (label === undefined || sublabel === undefined) return null
  if (categories) {
    return label ? { label, ...(sublabel ? { sublabel } : {}), y: value.y } : null
  }
  if (typeof value.x !== 'number' || !Number.isFinite(value.x)) return null
  return { x: value.x, ...(label ? { label } : {}), y: value.y }
}

/**
 * A sourced chart from a chart_data row, or null when the dataset has no
 * source (e.g. the older illustrative rows) or is malformed. A chart is only
 * shown with its source, so a dataset without one is never treated as real.
 */
export function parseMeasuredChart(row: {
  title: string
  chart_type: string
  note: string | null
  dataset: unknown
}): MeasuredChartData | null {
  const { dataset } = row
  if (!isRecord(dataset) || !CHART_TYPES.includes(row.chart_type as MeasuredChartType)) return null

  const x = axis(dataset.x)
  const y = axis(dataset.y)
  const kind = isRecord(dataset.x) ? dataset.x.kind : undefined
  if (!x || !y || (kind !== 'year' && kind !== 'category')) return null

  const source = dataset.source
  if (
    !isRecord(source) ||
    typeof source.name !== 'string' ||
    !isHttpsUrl(source.url) ||
    typeof source.retrieved !== 'string'
  ) {
    return null
  }
  const detail = optionalString(source.detail)

  if (!Array.isArray(dataset.points)) return null
  const points = dataset.points.map((item) => point(item, kind === 'category'))
  if (points.length === 0 || points.some((item) => item === null)) return null

  return {
    title: row.title,
    type: row.chart_type as MeasuredChartType,
    note: row.note,
    x: { ...x, kind },
    y,
    points: points as MeasuredPoint[],
    source: { name: source.name, url: source.url, retrieved: source.retrieved, detail: detail ?? null },
  }
}

/** "Final black-hole mass (M☉)". */
export function axisTitle(axisData: MeasuredAxis): string {
  return axisData.unit ? `${axisData.label} (${axisData.unit})` : axisData.label
}

/** Evenly spaced round tick values from 0 to at least `max` (steps of 1, 2 or 5 × 10^n). */
export function niceTicks(max: number, target = 5): number[] {
  if (!(max > 0)) return [0, 1]
  const rough = max / target
  const power = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((value) => value >= rough) ?? 10 * power
  const ticks: number[] = []
  for (let value = 0; value < max + step; value += step) {
    ticks.push(Number(value.toPrecision(12)))
    if (value >= max) break
  }
  return ticks
}

/** Whole-number year ticks across [min, max], about `target` of them. */
export function yearTicks(min: number, max: number, target = 7): number[] {
  const first = Math.ceil(min)
  const last = Math.floor(max)
  if (last <= first) return [first]
  const span = last - first
  const step = [1, 2, 5, 10, 20, 50].find((value) => span / value <= target) ?? 100
  const start = Math.ceil(first / step) * step
  const ticks: number[] = []
  for (let year = start; year <= last; year += step) ticks.push(year)
  return ticks
}
