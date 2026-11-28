import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../data/demoAuth', () => ({
  getCurrentSession: vi.fn(),
}));

vi.mock('../data/myThread', () => ({
  recordSearch: vi.fn(),
}));

vi.mock('../services/search/searchService', () => ({
  apiBaseUrl: '/api',
  searchSource: 'api',
}));

import { getCurrentSession } from '../data/demoAuth';
import {
  addRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
  syncRecentSearches,
  useRecentSearches,
} from './recentSearches';

const STORAGE_KEY = 'astrothread:recent-searches';
const user = { email: 'User@Example.com', fullName: 'Test User' };
const userKey = `${STORAGE_KEY}:user@example.com`;

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('recent searches saved on the server', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fetchMock.mockImplementation(() => jsonResponse({ searches: [] }));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(getCurrentSession).mockReturnValue(user as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends a new search to the server for signed-in users', () => {
    addRecentSearch('black holes');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recent-searches',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ query: 'black holes' }) }),
    );
  });

  it('does not send guest searches to the server', () => {
    vi.mocked(getCurrentSession).mockReturnValue(null);

    addRecentSearch('black holes');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('removes one search on the server', () => {
    removeRecentSearch('Black Holes');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recent-searches/Black%20Holes',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('clears all searches on the server', () => {
    clearRecentSearches();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recent-searches',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('loads the server list into this account\'s browser copy', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ searches: ['moon', 'sun'] }));

    const searches = await syncRecentSearches(user.email);

    expect(searches).toEqual(['moon', 'sun']);
    expect(localStorage.getItem(userKey)).toBe(JSON.stringify(['moon', 'sun']));
  });

  it('keeps the browser copy when the server fails', async () => {
    localStorage.setItem(userKey, JSON.stringify(['moon']));
    fetchMock.mockImplementation(() => jsonResponse({ error: 'down' }, 500));

    expect(await syncRecentSearches(user.email)).toBeNull();
    expect(localStorage.getItem(userKey)).toBe(JSON.stringify(['moon']));
  });

  it('shows the server list on the homepage after it loads', async () => {
    fetchMock.mockImplementation(() => jsonResponse({ searches: ['exoplanets'] }));

    const { result } = renderHook(() => useRecentSearches());

    await waitFor(() => {
      expect(result.current.searches).toEqual(['exoplanets']);
    });
  });

  it('does not ask the server for guests', () => {
    vi.mocked(getCurrentSession).mockReturnValue(null);

    renderHook(() => useRecentSearches());

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
