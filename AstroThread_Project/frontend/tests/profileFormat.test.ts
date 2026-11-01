// Tests for the Profile page text helpers (src/services/profileFormat.ts).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ProfileActivity } from '../src/services/api'
import {
  describeActivity,
  formatWhen,
  initialsFor,
  lastViewedLabel,
  nameFromEmail,
  progressSummary,
  roleBadge,
  shortName,
} from '../src/services/profileFormat'

describe('names and initials', () => {
  it('uses the stored name first', () => {
    assert.equal(shortName('Alaa Aldosari', 'x@example.com'), 'Alaa')
    assert.equal(initialsFor('Alaa Aldosari', 'x@example.com'), 'AA')
    assert.equal(initialsFor('  Alaa  ', 'x@example.com'), 'A')
  })

  it('falls back to the email', () => {
    assert.equal(nameFromEmail('alaa.aldosari@example.com'), 'Alaa')
    assert.equal(shortName(null, 'bothaina@example.com'), 'Bothaina')
    assert.equal(shortName('  ', 'bothaina@example.com'), 'Bothaina')
    assert.equal(initialsFor(null, 'alaa.aldosari@example.com'), 'AA')
    assert.equal(initialsFor(null, 'owner@example.com'), 'O')
  })

  it('names the role badge as in Figma', () => {
    assert.equal(roleBadge('user'), 'Research Explorer')
    assert.equal(roleBadge('owner'), 'Owner')
  })
})

describe('progressSummary', () => {
  it('shows the current stage and bar width', () => {
    assert.deepEqual(progressSummary({ current_stage: 3, stage_count: 5 }), {
      label: 'Stage 3 of 5',
      percent: 60,
      started: true,
    })
  })

  it('handles threads that were not started and bad values', () => {
    assert.deepEqual(progressSummary(null), { label: 'Not started', percent: 0, started: false })
    assert.equal(progressSummary({ current_stage: 9, stage_count: 5 }).percent, 100)
    assert.equal(progressSummary({ current_stage: 1, stage_count: 0 }).started, false)
  })
})

describe('dates', () => {
  const now = new Date(2026, 9, 31, 18, 0)

  it('says today and yesterday with the time, otherwise the date', () => {
    assert.equal(formatWhen('2026-10-31T14:20:00', now), 'Today, 14:20')
    assert.equal(formatWhen('2026-10-30T21:05:00', now), 'Yesterday, 21:05')
    assert.equal(formatWhen('2026-10-03T09:00:00', now), '3 Oct 2026')
  })

  it('returns an empty string for missing or invalid dates', () => {
    assert.equal(formatWhen(null, now), '')
    assert.equal(formatWhen('not a date', now), '')
    assert.equal(lastViewedLabel(undefined, now), '')
  })

  it('builds the "Last viewed" label', () => {
    assert.equal(lastViewedLabel('2026-10-31T14:20:00', now), 'Last viewed today, 14:20')
    assert.equal(lastViewedLabel('2026-10-03T09:00:00', now), 'Last viewed 3 Oct 2026')
  })
})

describe('describeActivity', () => {
  const base: ProfileActivity = {
    id: 1,
    type: 'started_thread',
    stage_number: null,
    created_at: null,
    thread: { id: 1, title: 'Black Holes' },
    paper: null,
    discovery: null,
  }

  it('describes each activity type', () => {
    assert.deepEqual(describeActivity(base), {
      kind: 'started',
      title: 'Started a Research Thread',
      detail: 'Black Holes',
    })
    assert.equal(
      describeActivity({ ...base, type: 'completed_stage', stage_number: 2 }).detail,
      'Black Holes · Stage 02',
    )
    assert.equal(
      describeActivity({ ...base, type: 'read_paper', paper: { id: 3, title: 'Singularities' } }).detail,
      'Singularities',
    )
    assert.equal(
      describeActivity({ ...base, type: 'viewed_discovery', discovery: { id: 7, title: 'First image' } })
        .title,
      'Explored a Discovery',
    )
  })

  it('does not break on unknown types', () => {
    assert.equal(describeActivity({ ...base, type: 'something_new' }).kind, 'other')
  })
})
