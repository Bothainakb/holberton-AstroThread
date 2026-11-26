
import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateFullName,
  validateTerms,
  getFirstErrorField,
  hasFieldErrors,
} from './validation';

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('alaa@example.com')).toBeUndefined();
  });

  it('rejects an empty email', () => {
    expect(validateEmail('')).toBe('Enter your email address.');
  });

  it('rejects an invalid email', () => {
    expect(validateEmail('alaa@invalid')).toBe(
      'Enter a valid email address, like name@example.com.',
    );
  });

  it('trims spaces before validating', () => {
    expect(validateEmail(' alaa@example.com ')).toBeUndefined();
  });
});

describe('validateFullName', () => {
  it('accepts a valid name', () => {
    expect(validateFullName('Alaa Ali')).toBeUndefined();
  });

  it('rejects an empty name', () => {
    expect(validateFullName('')).toBe('Enter your name.');
  });

  it('rejects a name containing only spaces', () => {
    expect(validateFullName('   ')).toBe('Enter your name.');
  });
});

describe('validateTerms', () => {
  it('accepts when terms are checked', () => {
    expect(validateTerms(true)).toBeUndefined();
  });

  it('rejects when terms are not checked', () => {
    expect(validateTerms(false)).toBe(
      'Agree to the terms to create an account.',
    );
  });
});

describe('getFirstErrorField', () => {
  it('returns the first field containing an error', () => {
    const errors = {
      email: 'Invalid email',
      fullName: 'Name required',
    };

    expect(
      getFirstErrorField(['fullName', 'email'], errors),
    ).toBe('fullName');
  });

  it('returns undefined when there are no errors', () => {
    expect(
      getFirstErrorField(['email', 'fullName'], {}),
    ).toBeUndefined();
  });
});

describe('hasFieldErrors', () => {
  it('returns true when errors exist', () => {
    expect(hasFieldErrors({ email: 'Invalid email' })).toBe(true);
  });

  it('returns false when there are no errors', () => {
    expect(hasFieldErrors({})).toBe(false);
  });
});
