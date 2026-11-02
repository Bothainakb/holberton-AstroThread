// Text shown on the Profile page and in the signed-in user menu, built from
// the API data. Kept free of React so the tests can check it directly.
import type { ProfileActivity, Role, ThreadProgress } from './api'

/** "alaa.aldosari@example.com" -> "Alaa" (used where only the email is known). */
export function nameFromEmail(email: string) {
  const first = email.split('@')[0].split(/[._+-]/).find(Boolean) ?? email
  return first.charAt(0).toUpperCase() + first.slice(1)
}

/** First name for the user menu: "Alaa Aldosari" -> "Alaa", else from the email. */
export function shortName(name: string | null | undefined, email: string) {
  const first = name?.trim().split(/\s+/)[0]
  return first || nameFromEmail(email)
}

/** "Alaa Aldosari" -> "AA", "Alaa" -> "A", no name -> from the email. */
export function initialsFor(name: string | null | undefined, email: string) {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    const parts = email.split('@')[0].split(/[._+-]/).filter(Boolean)
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? email)[0] ?? '?').toUpperCase()
  }
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0][0]
  return letters.toUpperCase()
}

/** The badge next to the name: "Research Explorer" for users, as in Figma "08-Profile"; owners show as "Admin". */
export function roleBadge(role: Role) {
  return role === 'owner' ? 'Admin' : 'Research Explorer'
}

export function roleLabel(role: Role) {
  return role === 'owner' ? 'Admin' : 'User'
}

/** "Stage 3 of 5" and the bar width (60). Null progress = not started. */
export function progressSummary(progress: ThreadProgress | null) {
  if (!progress || progress.stage_count <= 0) {
    return { label: 'Not started', percent: 0, started: false }
  }
  const stage = Math.min(Math.max(progress.current_stage, 1), progress.stage_count)
  return {
    label: `Stage ${stage} of ${progress.stage_count}`,
    percent: Math.round((stage / progress.stage_count) * 100),
    started: true,
  }
}

/**
 * The API sends timestamps without a time zone ("2026-10-31T14:20:05"),
 * which the browser reads as local time. Returns null for missing or
 * unreadable values.
 */
export function parseApiDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

const DAY = 24 * 60 * 60 * 1000

/** "Today, 14:20", "Yesterday, 21:05" or "3 Oct 2026", as in Figma "08-Profile". */
export function formatWhen(value: string | null | undefined, now = new Date()) {
  const date = parseApiDate(value)
  if (!date) return ''
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY)
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Yesterday, ${time}`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** "Last viewed today, 14:20" / "Last viewed 3 Oct 2026". */
export function lastViewedLabel(value: string | null | undefined, now = new Date()) {
  const when = formatWhen(value, now)
  if (!when) return ''
  return `Last viewed ${/^(Today|Yesterday)/.test(when) ? when.charAt(0).toLowerCase() + when.slice(1) : when}`
}

/** "October 2026" for "Member since". */
export function memberSince(value: string | null | undefined) {
  const date = parseApiDate(value)
  return date ? date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : ''
}

export type ActivityKind = 'started' | 'stage' | 'paper' | 'discovery' | 'other'

/** Title, detail line and icon of one "Research Activity" item. */
export function describeActivity(activity: ProfileActivity) {
  const thread = activity.thread?.title
  switch (activity.type) {
    case 'started_thread':
      return { kind: 'started' as ActivityKind, title: 'Started a Research Thread', detail: thread ?? '' }
    case 'completed_stage': {
      const stage =
        activity.stage_number !== null ? `Stage ${String(activity.stage_number).padStart(2, '0')}` : 'A stage'
      return {
        kind: 'stage' as ActivityKind,
        title: 'Completed a Research Stage',
        detail: thread ? `${thread} · ${stage}` : stage,
      }
    }
    case 'read_paper':
      return {
        kind: 'paper' as ActivityKind,
        title: 'Read a Research Paper',
        detail: activity.paper?.title ?? thread ?? '',
      }
    case 'viewed_discovery':
      return {
        kind: 'discovery' as ActivityKind,
        title: 'Explored a Discovery',
        detail: activity.discovery?.title ?? thread ?? '',
      }
    default:
      return { kind: 'other' as ActivityKind, title: 'Research activity', detail: thread ?? '' }
  }
}
