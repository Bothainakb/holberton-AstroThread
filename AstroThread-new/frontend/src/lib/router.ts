import { useEffect, useSyncExternalStore } from "react";

export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  search: "/search",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

const appRoutes: readonly string[] = Object.values(routes);
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getLocationSnapshot() {
  return `${window.location.pathname}${window.location.search}`;
}

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isAppRoute(pathname: string): boolean {
  return appRoutes.includes(normalizePath(pathname));
}

interface NavigateOptions {
  replace?: boolean;
}

export function navigate(to: string, options: NavigateOptions = {}) {
  const url = new URL(to, window.location.href);

  if (url.origin !== window.location.origin || !isAppRoute(url.pathname)) {
    window.location.assign(url.href);
    return;
  }

  const nextLocation = `${url.pathname}${url.search}${url.hash}`;

  if (options.replace) {
    window.history.replaceState(null, "", nextLocation);
  } else {
    window.history.pushState(null, "", nextLocation);
    window.scrollTo(0, 0);
  }

  notifyListeners();
}

export function useLocation() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getLocationSnapshot,
    getLocationSnapshot,
  );
  const url = new URL(snapshot, window.location.origin);

  return {
    pathname: normalizePath(url.pathname),
    searchParams: url.searchParams,
  };
}

function findInternalLink(event: MouseEvent): HTMLAnchorElement | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return null;
  }

  const link = target.closest("a");

  if (
    !link ||
    !link.href ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  ) {
    return null;
  }

  const url = new URL(link.href);

  if (url.origin !== window.location.origin || !isAppRoute(url.pathname)) {
    return null;
  }

  return link;
}

export function useInternalLinkNavigation() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const link = findInternalLink(event);

      if (!link) {
        return;
      }

      event.preventDefault();
      const url = new URL(link.href);
      navigate(`${url.pathname}${url.search}${url.hash}`);
    }

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);
}