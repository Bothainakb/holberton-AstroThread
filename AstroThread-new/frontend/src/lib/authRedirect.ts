import { routes } from "./router";

const AUTH_PATHS: readonly string[] = [routes.signIn, routes.signUp];

function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//");
}

export function getReturnPath(searchParams: URLSearchParams): string {
  const from = searchParams.get("from");

  if (!from || !isSafeInternalPath(from)) {
    return routes.home;
  }

  const pathname = from.split(/[?#]/)[0];
  return AUTH_PATHS.includes(pathname) ? routes.home : from;
}

export function buildAuthHref(
  route: string,
  email: string,
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams();
  const from = searchParams.get("from");

  if (email.trim()) {
    params.set("email", email.trim());
  }

  if (from) {
    params.set("from", from);
  }

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}