// Tests for searching design-only threads on Home (data/threadSearch.ts).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  databaseSlug,
  designOnlyMatches,
  designOnlyThreads,
  matchesThread,
  matchesWordStart,
} from '../src/data/threadSearch'

// GET /api/threads on a database without migration 007 (no Dark Matter row
// and no slug column), where Dark Matter is still a design preview.
const DATABASE = [
  { id: 1, title: 'Black Holes' },
  { id: 3, title: 'Exoplanets' },
]

/** The three library topics, and the topics removed from the library. */
const TOPICS = ['black-holes', 'exoplanets', 'dark-matter']
const REMOVED = ['gravitational-waves', 'neutron-stars', 'expanding-universe']

const ids = (query: string) => designOnlyMatches(query, DATABASE).map((thread) => thread.id)

describe('matchesWordStart', () => {
  it('matches the query at the start of a word, ignoring case', () => {
    assert.ok(matchesWordStart('Dark Matter', 'Dark Matter'))
    assert.ok(matchesWordStart('Dark Matter', 'dark matter'))
    assert.ok(matchesWordStart('Dark Matter', 'dark'))
    assert.ok(matchesWordStart('Dark Matter', 'MATTER'))
    assert.ok(matchesWordStart('the (dark) sky', 'dark'))
  })

  it('does not match inside a word, and treats symbols literally', () => {
    assert.ok(!matchesWordStart('Dark Matter', 'atter'))
    assert.ok(!matchesWordStart('Dark Matter', 'ark'))
    assert.ok(!matchesWordStart('Dark Matter', ''))
    assert.ok(!matchesWordStart('Dark Matter', '.*'))
    assert.ok(matchesWordStart('cost (1+1)', '(1+1)'))
  })
})

describe('designOnlyMatches', () => {
  it('finds Dark Matter by its title and by each word of it', () => {
    assert.deepEqual(ids('Dark Matter'), ['dark-matter'])
    assert.ok(ids('dark').includes('dark-matter'))
    assert.ok(ids('matter').includes('dark-matter'))
    assert.ok(ids('dark matter').includes('dark-matter'))
  })

  it('never returns a design thread that is in the database', () => {
    for (const query of ['Black Holes', 'black', 'gravity', 'Exoplanets', 'planets', 'stars']) {
      const found = ids(query)
      for (const inDatabase of ['black-holes', 'exoplanets']) {
        assert.ok(!found.includes(inDatabase), `${query} -> ${found.join(', ')}`)
      }
    }
  })

  it('returns the design entry when its thread is not in the database at all', () => {
    assert.deepEqual(designOnlyMatches('Black Holes', []).map((thread) => thread.id), ['black-holes'])
  })

  it('returns nothing for a word that is in no design thread', () => {
    assert.deepEqual(ids('zzzz'), [])
    assert.deepEqual(ids('atter'), [])
  })
})

describe('databaseSlug and designOnlyThreads (Research Threads page)', () => {
  it('gives database threads the slug of their title when they have none', () => {
    assert.equal(databaseSlug({ id: 1, title: 'Black Holes' }), 'black-holes')
    assert.equal(databaseSlug({ id: 2, slug: null, title: 'Dark Matter' }), 'dark-matter')
    assert.equal(databaseSlug({ id: 7, slug: 'bh', title: 'Black Holes' }), 'bh')
  })

  it('lists exactly the design threads with no database record', () => {
    assert.deepEqual(
      designOnlyThreads(DATABASE).map((thread) => thread.id),
      ['dark-matter'],
    )
  })

  it('matches a thread by title, category or description', () => {
    const thread = { title: 'Dark Matter', category: 'Cosmology', description: 'Invisible matter.' }
    assert.ok(matchesThread(thread, 'cosmo'))
    assert.ok(matchesThread(thread, 'invisible'))
    assert.ok(!matchesThread(thread, 'osmology'))
  })
})

describe('regression: the library has exactly three topics', () => {
  it('keeps Black Holes, Exoplanets and Dark Matter in the design list, in order', () => {
    assert.deepEqual(designOnlyThreads([]).map((thread) => thread.id), TOPICS)
  })

  it('never lists the removed topics, by slug or by search', () => {
    const ids = designOnlyThreads([]).map((thread) => thread.id)
    for (const removed of REMOVED) assert.ok(!ids.includes(removed), removed)
    for (const query of ['Gravitational Waves', 'Neutron Stars', 'neutron', 'The Expanding Universe', 'expanding']) {
      const found = designOnlyMatches(query, []).map((thread) => thread.id)
      for (const removed of REMOVED) assert.ok(!found.includes(removed), `${query} -> ${found.join(', ')}`)
    }
  })

  it('finds the Dark Matter preview by its title and by each word of it', () => {
    for (const query of ['Dark Matter', 'dark', 'matter', 'cosmology']) {
      assert.ok(ids(query).includes('dark-matter'), `${query} -> ${ids(query).join(', ')}`)
    }
  })

  it('has no previews once the database has all three topics', () => {
    const allInDatabase = [...DATABASE, { id: 207, slug: 'dark-matter', title: 'Dark Matter' }]
    assert.deepEqual(designOnlyThreads(allInDatabase), [])
  })
})
