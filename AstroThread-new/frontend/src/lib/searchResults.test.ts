
import { describe, it, expect } from 'vitest';
import type { PaperSummary } from '../types/research';
import {
  RESULTS_PER_PAGE,
  EMPTY_FILTERS,
  readSearchState,
  buildSearchParams,
  countActiveFilters,
  applyFilters,
  sortPapers,
  paginate,
  getTopicFacets,
  getPaperTypeFacets,
  getAuthorFacets,
  getRelatedKeywords,
} from './searchResults';

const papers: PaperSummary[] = [
  {
    id: '1',
    title: 'Black Holes',
    authors: ['Alaa Ali', 'Sara Ahmed'],
    year: 2024,
    venue: 'Science Journal',
    topic: 'Black Holes',
    paperType: 'observational',
    keywords: ['gravity', 'space'],
    abstract: 'A study about black holes.',
  },
  {
    id: '2',
    title: 'Gravitational Waves',
    authors: ['Sara Ahmed'],
    year: 2010,
    venue: 'Physics Journal',
    topic: 'Gravitational Waves',
    paperType: 'theoretical',
    keywords: ['gravity', 'waves'],
    abstract: 'A study about gravitational waves.',
  },
  {
    id: '3',
    title: 'Exoplanets',
    authors: ['Mona Saleh'],
    year: 1990,
    venue: 'Space Journal',
    topic: 'Exoplanets',
    paperType: 'observational',
    keywords: ['planets', 'space'],
    abstract: 'A study about exoplanets.',
  },
  {
    id: '4',
    title: 'Black Hole Theory',
    authors: ['Alaa Ali'],
    year: 2005,
    venue: 'Research Journal',
    topic: 'Black Holes',
    paperType: 'theoretical',
    keywords: ['gravity', 'theory'],
    abstract: 'A theoretical study about black holes.',
  },
  {
    id: '5',
    title: 'Cosmic Research',
    authors: ['Nora Omar'],
    year: 1950,
    venue: 'Science Journal',
    topic: 'Cosmology',
    paperType: 'observational',
    keywords: ['cosmos', 'space'],
    abstract: 'A study about the universe.',
  },
  {
    id: '6',
    title: 'Modern Astronomy',
    authors: ['Mona Saleh'],
    year: 2022,
    venue: 'Astronomy Journal',
    topic: 'Exoplanets',
    paperType: 'theoretical',
    keywords: ['planets', 'astronomy'],
    abstract: 'A modern astronomy study.',
  },
];

describe('search constants', () => {
  it('sets five results per page', () => {
    expect(RESULTS_PER_PAGE).toBe(5);
  });

  it('provides empty default filters', () => {
    expect(EMPTY_FILTERS).toEqual({
      topics: [],
      paperTypes: [],
      yearRange: 'any',
      author: '',
    });
  });
});

describe('readSearchState', () => {
  it('reads search parameters', () => {
    const params = new URLSearchParams(
      'q=black%20holes&topic=Black%20Holes&type=observational&year=2010-later&author=Alaa%20Ali&sort=newest&page=2',
    );

    expect(readSearchState(params)).toEqual({
      query: 'black holes',
      filters: {
        topics: ['Black Holes'],
        paperTypes: ['observational'],
        yearRange: '2010-later',
        author: 'Alaa Ali',
      },
      sort: 'newest',
      page: 2,
    });
  });

  it('uses defaults for invalid parameters', () => {
    const params = new URLSearchParams(
      'year=invalid&sort=invalid&page=-2&type=unknown',
    );

    expect(readSearchState(params)).toEqual({
      query: '',
      filters: {
        topics: [],
        paperTypes: [],
        yearRange: 'any',
        author: '',
      },
      sort: 'relevance',
      page: 1,
    });
  });

  it('trims the search query', () => {
    const params = new URLSearchParams('q=%20black%20holes%20');

    expect(readSearchState(params).query).toBe('black holes');
  });
});

describe('buildSearchParams', () => {
  it('builds URL parameters from search state', () => {
    const params = buildSearchParams({
      query: 'black holes',
      filters: {
        topics: ['Black Holes'],
        paperTypes: ['observational'],
        yearRange: '2010-later',
        author: 'Alaa Ali',
      },
      sort: 'newest',
      page: 2,
    });

    expect(params.get('q')).toBe('black holes');
    expect(params.getAll('topic')).toEqual(['Black Holes']);
    expect(params.getAll('type')).toEqual(['observational']);
    expect(params.get('year')).toBe('2010-later');
    expect(params.get('author')).toBe('Alaa Ali');
    expect(params.get('sort')).toBe('newest');
    expect(params.get('page')).toBe('2');
  });

  it('omits default and empty parameters', () => {
    const params = buildSearchParams({
      query: '',
      filters: EMPTY_FILTERS,
      sort: 'relevance',
      page: 1,
    });

    expect(params.toString()).toBe('');
  });
});

describe('countActiveFilters', () => {
  it('counts all active filters', () => {
    expect(
      countActiveFilters({
        topics: ['Black Holes', 'Exoplanets'],
        paperTypes: ['observational'],
        yearRange: '2010-later',
        author: 'Alaa Ali',
      }),
    ).toBe(5);
  });

  it('returns zero when no filters are active', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });
});

describe('applyFilters', () => {
  it('filters papers by topic', () => {
    const result = applyFilters(papers, {
      ...EMPTY_FILTERS,
      topics: ['Black Holes'],
    });

    expect(result.map((paper) => paper.id)).toEqual(['1', '4']);
  });

  it('filters papers by paper type', () => {
    const result = applyFilters(papers, {
      ...EMPTY_FILTERS,
      paperTypes: ['theoretical'],
    });

    expect(result.map((paper) => paper.id)).toEqual(['2', '4', '6']);
  });

  it('filters papers by year range', () => {
    const result = applyFilters(papers, {
      ...EMPTY_FILTERS,
      yearRange: '2000-2009',
    });

    expect(result.map((paper) => paper.id)).toEqual(['4']);
  });

  it('filters papers by author', () => {
    const result = applyFilters(papers, {
      ...EMPTY_FILTERS,
      author: 'Alaa Ali',
    });

    expect(result.map((paper) => paper.id)).toEqual(['1', '4']);
  });

  it('combines multiple filters', () => {
    const result = applyFilters(papers, {
      topics: ['Black Holes'],
      paperTypes: ['theoretical'],
      yearRange: '2000-2009',
      author: 'Alaa Ali',
    });

    expect(result.map((paper) => paper.id)).toEqual(['4']);
  });

  it('returns all papers when filters are empty', () => {
    expect(applyFilters(papers, EMPTY_FILTERS)).toEqual(papers);
  });
});

describe('sortPapers', () => {
  it('sorts papers from newest to oldest', () => {
    const result = sortPapers(papers, 'newest');

    expect(result.map((paper) => paper.year)).toEqual([
      2024, 2022, 2010, 2005, 1990, 1950,
    ]);
  });

  it('sorts papers from oldest to newest', () => {
    const result = sortPapers(papers, 'oldest');

    expect(result.map((paper) => paper.year)).toEqual([
      1950, 1990, 2005, 2010, 2022, 2024,
    ]);
  });

  it('preserves the original order for relevance', () => {
    const result = sortPapers(papers, 'relevance');

    expect(result.map((paper) => paper.id)).toEqual([
      '1', '2', '3', '4', '5', '6',
    ]);
  });

  it('does not mutate the original array', () => {
    sortPapers(papers, 'newest');

    expect(papers.map((paper) => paper.year)).toEqual([
      2024, 2010, 1990, 2005, 1950, 2022,
    ]);
  });
});

describe('paginate', () => {
  it('returns the first five items on the first page', () => {
    const result = paginate(papers, 1);

    expect(result.items.map((paper) => paper.id)).toEqual([
      '1', '2', '3', '4', '5',
    ]);
    expect(result.currentPage).toBe(1);
    expect(result.pageCount).toBe(2);
  });

  it('returns the remaining items on the second page', () => {
    const result = paginate(papers, 2);

    expect(result.items.map((paper) => paper.id)).toEqual(['6']);
    expect(result.currentPage).toBe(2);
  });

  it('limits the requested page to the last page', () => {
    const result = paginate(papers, 10);

    expect(result.currentPage).toBe(2);
    expect(result.items).toHaveLength(1);
  });

  it('returns an empty page with page count one for empty items', () => {
    const result = paginate([], 1);

    expect(result.items).toEqual([]);
    expect(result.currentPage).toBe(1);
    expect(result.pageCount).toBe(1);
  });
});

describe('getTopicFacets', () => {
  it('counts papers by topic', () => {
    expect(getTopicFacets(papers)).toEqual([
      { value: 'Black Holes', label: 'Black Holes', count: 2 },
      { value: 'Exoplanets', label: 'Exoplanets', count: 2 },
      { value: 'Cosmology', label: 'Cosmology', count: 1 },
      { value: 'Gravitational Waves', label: 'Gravitational Waves', count: 1 },
    ]);
  });
});

describe('getPaperTypeFacets', () => {
  it('counts paper types and uses readable labels', () => {
    expect(getPaperTypeFacets(papers)).toEqual([
      { value: 'observational', label: 'Observational', count: 3 },
      { value: 'theoretical', label: 'Theoretical', count: 3 },
    ]);
  });
});

describe('getAuthorFacets', () => {
  it('counts author appearances across papers', () => {
    expect(getAuthorFacets(papers)).toEqual([
      { value: 'Alaa Ali', label: 'Alaa Ali', count: 2 },
      { value: 'Mona Saleh', label: 'Mona Saleh', count: 2 },
      { value: 'Sara Ahmed', label: 'Sara Ahmed', count: 2 },
      { value: 'Nora Omar', label: 'Nora Omar', count: 1 },
    ]);
  });
});

describe('getRelatedKeywords', () => {
  it('counts related keywords and sorts them by frequency', () => {
    expect(getRelatedKeywords(papers, 'gravity')).toEqual([
      { value: 'space', label: 'space', count: 3 },
      { value: 'planets', label: 'planets', count: 2 },
      { value: 'astronomy', label: 'astronomy', count: 1 },
      { value: 'cosmos', label: 'cosmos', count: 1 },
      { value: 'theory', label: 'theory', count: 1 },
      { value: 'waves', label: 'waves', count: 1 },
    ]);
  });

  it('excludes the exact query keyword ignoring case', () => {
    const result = getRelatedKeywords(papers, 'GRAVITY');

    expect(result.some((option) => option.value === 'gravity')).toBe(false);
  });

  it('respects the requested limit', () => {
    expect(getRelatedKeywords(papers, '', 2)).toHaveLength(2);
  });
});
