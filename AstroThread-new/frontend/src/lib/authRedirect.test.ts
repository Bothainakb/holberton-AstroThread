
import { describe, it, expect } from 'vitest';
import { getReturnPath, buildAuthHref } from './authRedirect';
import { routes } from './router';

describe('getReturnPath', () => {
  it('returns the home route when from is missing', () => {
    const params = new URLSearchParams();

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('returns the home route for an external URL', () => {
    const params = new URLSearchParams(
      'from=https://example.com',
    );

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('rejects paths starting with double slashes', () => {
    const params = new URLSearchParams('from=//example.com');

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('returns a safe internal path', () => {
    const params = new URLSearchParams(
      'from=%2Fmy-thread',
    );

    expect(getReturnPath(params)).toBe('/my-thread');
  });

  it('returns the home route when redirecting to sign in', () => {
    const params = new URLSearchParams(
      `from=${encodeURIComponent(routes.signIn)}`,
    );

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('returns the home route when redirecting to sign up', () => {
    const params = new URLSearchParams(
      `from=${encodeURIComponent(routes.signUp)}`,
    );

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('rejects sign in paths with query parameters', () => {
    const params = new URLSearchParams(
      `from=${encodeURIComponent(`${routes.signIn}?email=test@example.com`)}`,
    );

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('rejects sign up paths with query parameters', () => {
    const params = new URLSearchParams(
      `from=${encodeURIComponent(`${routes.signUp}?email=test@example.com`)}`,
    );

    expect(getReturnPath(params)).toBe(routes.home);
  });

  it('preserves query parameters in safe internal paths', () => {
    const params = new URLSearchParams(
      'from=%2Fmy-thread%3Ftab%3Dpapers',
    );

    expect(getReturnPath(params)).toBe('/my-thread?tab=papers');
  });

  it('preserves hash fragments in safe internal paths', () => {
    const params = new URLSearchParams(
      'from=%2Fprofile%23settings',
    );

    expect(getReturnPath(params)).toBe('/profile#settings');
  });
});

describe('buildAuthHref', () => {
  it('builds an auth URL with a trimmed email', () => {
    const params = new URLSearchParams();

    expect(
      buildAuthHref(routes.signIn, '  test@example.com  ', params),
    ).toBe(`${routes.signIn}?email=test%40example.com`);
  });

  it('includes the return path', () => {
    const params = new URLSearchParams(
      'from=%2Fmy-thread',
    );

    expect(
      buildAuthHref(routes.signIn, '', params),
    ).toBe(`${routes.signIn}?from=%2Fmy-thread`);
  });

  it('includes both email and return path', () => {
    const params = new URLSearchParams(
      'from=%2Fmy-thread',
    );

    expect(
      buildAuthHref(routes.signUp, 'test@example.com', params),
    ).toBe(
      `${routes.signUp}?email=test%40example.com&from=%2Fmy-thread`,
    );
  });

  it('does not include an empty email', () => {
    const params = new URLSearchParams();

    expect(buildAuthHref(routes.signIn, '   ', params)).toBe(
      routes.signIn,
    );
  });

  it('returns the route without query parameters when no values exist', () => {
    const params = new URLSearchParams();

    expect(buildAuthHref(routes.signIn, '', params)).toBe(
      routes.signIn,
    );
  });

  it('preserves the original from value', () => {
    const params = new URLSearchParams(
      'from=%2Fprofile%3Ftab%3Dsettings',
    );

    expect(
      buildAuthHref(routes.signIn, '', params),
    ).toBe(`${routes.signIn}?from=%2Fprofile%3Ftab%3Dsettings`);
  });
});
