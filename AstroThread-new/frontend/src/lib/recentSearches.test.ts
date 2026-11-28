import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../data/demoAuth', () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('../data/myThread', () => ({
  recordSearch: vi.fn(),
}));

import { getCurrentSession } from '../data/demoAuth';
import { recordSearch } from '../data/myThread';
import {
  MAX_RECENT_SEARCHES,
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  useRecentSearches,
} from './recentSearches';

const STORAGE_KEY = 'astrothread:recent-searches';

describe('recent searches', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getCurrentSession).mockReturnValue(null);
  });

  it('sets the maximum number of recent searches to five', () => {
    expect(MAX_RECENT_SEARCHES).toBe(5);
  });

  it('returns an empty array when no searches exist', () => {
    expect(getRecentSearches()).toEqual([]);
  });

  it('reads searches from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['black holes']));

    expect(getRecentSearches()).toEqual(['black holes']);
  });

  it('returns an empty array for invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json');

    expect(getRecentSearches()).toEqual([]);
  });

  it('returns an empty array when stored data is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ query: 'space' }));

    expect(getRecentSearches()).toEqual([]);
  });

  it('removes invalid and empty entries', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['black holes', '', 123, '  ', 'exoplanets']),
    );

    expect(getRecentSearches()).toEqual(['black holes', 'exoplanets']);
  });

  it('limits stored searches to five items', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['one', 'two', 'three', 'four', 'five', 'six']),
    );

    expect(getRecentSearches()).toHaveLength(5);
  });

  it('adds a new search at the beginning', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['exoplanets']));

    expect(addRecentSearch('black holes')).toEqual([
      'black holes',
      'exoplanets',
    ]);
  });

  it('trims whitespace from a search query', () => {
    expect(addRecentSearch('  black holes  ')).toEqual(['black holes']);
  });

  it('does not add an empty search', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['exoplanets']));

    expect(addRecentSearch('   ')).toEqual(['exoplanets']);
  });

  it('does not add duplicate searches with different letter cases', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['Black Holes']));

    expect(addRecentSearch('black holes')).toEqual(['black holes']);
  });

  it('keeps only the five most recent searches', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['one', 'two', 'three', 'four', 'five']),
    );

    expect(addRecentSearch('new search')).toEqual([
      'new search',
      'one',
      'two',
      'three',
      'four',
    ]);
  });

  it('removes a search without considering letter case', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['Black Holes', 'Exoplanets']),
    );

    expect(removeRecentSearch('black holes')).toEqual(['Exoplanets']);
  });

  it('clears all recent searches', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['black holes']));

    expect(clearRecentSearches()).toEqual([]);
    expect(getRecentSearches()).toEqual([]);
  });

  it('does not record a search when there is no active session', () => {
    addRecentSearch('black holes');

    expect(recordSearch).not.toHaveBeenCalled();
  });
});

describe('useRecentSearches', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getCurrentSession).mockReturnValue(null);
  });

  it('loads recent searches when the hook starts', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['black holes']));

    const { result } = renderHook(() => useRecentSearches());

    expect(result.current.searches).toEqual(['black holes']);
  });

  it('adds a search and updates the hook state', () => {
    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.add('black holes');
    });

    expect(result.current.searches).toEqual(['black holes']);
  });

  it('removes a search and updates the hook state', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(['black holes', 'exoplanets']),
    );

    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.remove('black holes');
    });

    expect(result.current.searches).toEqual(['exoplanets']);
  });

  it('clears searches and updates the hook state', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['black holes']));

    const { result } = renderHook(() => useRecentSearches());

    act(() => {
      result.current.clear();
    });

    expect(result.current.searches).toEqual([]);
  });
});

describe('recent searches for each person', () => {
  const firstUser = { email: 'First@Example.com', fullName: 'First User' };
  const secondUser = { email: 'second@example.com', fullName: 'Second User' };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(getCurrentSession).mockReturnValue(null);
  });

  it('hides guest searches after logging in', () => {
    addRecentSearch('black holes');

    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);

    expect(getRecentSearches()).toEqual([]);
  });

  it('keeps each account\'s searches separate', () => {
    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    addRecentSearch('black holes');

    vi.mocked(getCurrentSession).mockReturnValue(secondUser as never);
    addRecentSearch('exoplanets');

    expect(getRecentSearches()).toEqual(['exoplanets']);

    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    expect(getRecentSearches()).toEqual(['black holes']);
  });

  it('hides an account\'s searches after logging out and keeps them for next time', () => {
    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    addRecentSearch('black holes');

    vi.mocked(getCurrentSession).mockReturnValue(null);
    expect(getRecentSearches()).toEqual([]);

    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    expect(getRecentSearches()).toEqual(['black holes']);
  });

  it('saves an account\'s searches under its lowercased email', () => {
    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    addRecentSearch('black holes');

    expect(localStorage.getItem(`${STORAGE_KEY}:first@example.com`)).toBe(
      JSON.stringify(['black holes']),
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearing only removes the current person\'s searches', () => {
    addRecentSearch('guest search');

    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    addRecentSearch('black holes');
    clearRecentSearches();

    expect(getRecentSearches()).toEqual([]);

    vi.mocked(getCurrentSession).mockReturnValue(null);
    expect(getRecentSearches()).toEqual(['guest search']);
  });

  it('records searches in My Thread only for signed-in users', () => {
    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    addRecentSearch('black holes');

    expect(recordSearch).toHaveBeenCalledWith('First@Example.com', 'black holes');
  });

  it('shows the right list after logging out without leaving the page', () => {
    vi.mocked(getCurrentSession).mockReturnValue(firstUser as never);
    addRecentSearch('black holes');

    const { result, rerender } = renderHook(() => useRecentSearches());
    expect(result.current.searches).toEqual(['black holes']);

    vi.mocked(getCurrentSession).mockReturnValue(null);
    rerender();

    expect(result.current.searches).toEqual([]);
  });
});
