
import { describe, it, expect } from 'vitest';
import {
  formatAuthors,
  formatAllAuthors,
  formatShortCitation,
  formatPaperMeta,
  formatPublication,
  formatYearRange,
} from './formatPaper';

describe('formatAuthors', () => {
  it('returns unknown authors when the list is empty', () => {
    expect(formatAuthors([])).toBe('Unknown authors');
  });

  it('joins authors when there are three or fewer', () => {
    expect(formatAuthors(['Alaa Ali', 'Sara Ahmed'])).toBe(
      'Alaa Ali, Sara Ahmed',
    );
  });

  it('limits authors and adds et al.', () => {
    expect(
      formatAuthors(['Alaa Ali', 'Sara Ahmed', 'Mona Saleh', 'Nora Omar']),
    ).toBe('Alaa Ali, Sara Ahmed, Mona Saleh et al.');
  });

  it('supports a custom author limit', () => {
    expect(formatAuthors(['A', 'B', 'C'], 2)).toBe('A, B et al.');
  });
});

describe('formatAllAuthors', () => {
  it('handles an empty author list', () => {
    expect(formatAllAuthors([])).toBe('Unknown authors');
  });

  it('handles one author', () => {
    expect(formatAllAuthors(['Alaa Ali'])).toBe('Alaa Ali');
  });

  it('joins multiple authors with and', () => {
    expect(formatAllAuthors(['Alaa', 'Sara', 'Mona'])).toBe(
      'Alaa, Sara and Mona',
    );
  });
});

describe('formatShortCitation', () => {
  it('formats a single author surname and year', () => {
    expect(formatShortCitation({ authors: ['Alaa Ali'], year: 2024 })).toBe(
      'Ali, 2024',
    );
  });

  it('formats two author surnames', () => {
    expect(
      formatShortCitation({
        authors: ['Alaa Ali', 'Sara Ahmed'],
        year: 2024,
      }),
    ).toBe('Ali and Ahmed, 2024');
  });

  it('uses et al. for more than two authors', () => {
    expect(
      formatShortCitation({
        authors: ['Alaa Ali', 'Sara Ahmed', 'Mona Saleh'],
        year: 2024,
      }),
    ).toBe('Ali et al., 2024');
  });

  it('handles missing authors', () => {
    expect(formatShortCitation({ authors: [], year: 2024 })).toBe(
      'Unknown authors, 2024',
    );
  });

  it('omits the year when it is zero', () => {
    expect(formatShortCitation({ authors: ['Alaa Ali'], year: 0 })).toBe(
      'Ali',
    );
  });
});

describe('formatPaperMeta', () => {
  it('formats authors, venue and year', () => {
    expect(
      formatPaperMeta({
        authors: ['Alaa Ali'],
        venue: 'Science Journal',
        year: 2024,
      }),
    ).toBe('Alaa Ali · Science Journal · 2024');
  });

  it('omits empty venue and year', () => {
    expect(
      formatPaperMeta({
        authors: [],
        venue: '',
        year: 0,
      }),
    ).toBe('Unknown authors');
  });
});

describe('formatPublication', () => {
  it('formats venue and year', () => {
    expect(
      formatPublication({ venue: 'Science Journal', year: 2024 }),
    ).toBe('Science Journal, 2024');
  });

  it('handles missing venue and year', () => {
    expect(formatPublication({ venue: '', year: 0 })).toBe('');
  });
});

describe('formatYearRange', () => {
  it('formats a range of years', () => {
    expect(formatYearRange(2000, 2024)).toBe('2000 to 2024');
  });

  it('formats the same start and end year', () => {
    expect(formatYearRange(2024, 2024)).toBe('2024');
  });

  it('returns empty string when a year is missing', () => {
    expect(formatYearRange(0, 2024)).toBe('');
  });
});
