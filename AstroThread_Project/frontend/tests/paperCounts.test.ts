// Tests for the paper count on thread cards (services/paperCounts.ts): the
// number of papers the thread's page lists, never a fixed number.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { listedPaperCount, MAX_PAPERS } from '../src/services/paperCounts'
import { MAX_PAPERS as PAGE_LIMIT } from '../src/pages/ThreadDetails/sections/RelatedPapers'

describe('listedPaperCount', () => {
  it('uses the papers in the database when the thread has some', () => {
    assert.equal(listedPaperCount(1, null), 1)
    assert.equal(listedPaperCount(2, 6), 2)
    assert.equal(listedPaperCount(3, null), 3)
  })

  it('uses the OpenAlex papers for a thread with none in the database', () => {
    assert.equal(listedPaperCount(0, 2), 2)
    assert.equal(listedPaperCount(0, 0), 0)
    assert.equal(listedPaperCount(0, null), null)
  })

  it('never counts more papers than the thread page lists', () => {
    assert.equal(listedPaperCount(10, null), MAX_PAPERS)
    assert.equal(listedPaperCount(0, 6), MAX_PAPERS)
    assert.equal(PAGE_LIMIT, MAX_PAPERS)
  })
})
