// Tests for the "?next=" return path used after signing in from the bookmark
// prompt (safeReturnPath and withReturnPath in router/router.ts).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { safeReturnPath, withReturnPath } from '../src/router/router'

describe('safeReturnPath', () => {
  it('accepts Thread Details paths on this site', () => {
    assert.equal(safeReturnPath('/research-threads/black-holes'), '/research-threads/black-holes')
    assert.equal(safeReturnPath('/research-threads/1'), '/research-threads/1')
  })

  it('rejects anything that could leave the site or open another page', () => {
    for (const value of [
      null,
      undefined,
      '',
      'https://evil.example/research-threads/black-holes',
      '//evil.example/research-threads/black-holes',
      '/\\evil.example/research-threads/x',
      'javascript:alert(1)',
      'research-threads/black-holes',
      '/research-threads',
      '/research-threads/black-holes/extra',
      '/profile',
      '/login',
    ]) {
      assert.equal(safeReturnPath(value), null, String(value))
    }
  })
})

describe('withReturnPath', () => {
  it('adds an encoded next parameter for a thread path', () => {
    assert.equal(
      withReturnPath('/login', '/research-threads/black-holes'),
      '/login?next=%2Fresearch-threads%2Fblack-holes',
    )
  })

  it('leaves the page unchanged for unsafe or missing paths', () => {
    assert.equal(withReturnPath('/signup', '//evil.example/x'), '/signup')
    assert.equal(withReturnPath('/signup', null), '/signup')
  })
})
