
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  routes,
  normalizePath,
  getRouteId,
  paperPath,
  isAppRoute,
  navigate,
} from "./router";

describe("routes", () => {
  it("contains the correct application paths", () => {
    expect(routes.home).toBe("/");
    expect(routes.signIn).toBe("/sign-in");
    expect(routes.signUp).toBe("/sign-up");
    expect(routes.search).toBe("/search");
    expect(routes.papers).toBe("/papers");
    expect(routes.myThread).toBe("/my-thread");
    expect(routes.profile).toBe("/profile");
    expect(routes.admin).toBe("/admin");
  });
});

describe("normalizePath", () => {
  it("removes a trailing slash", () => {
    expect(normalizePath("/search/")).toBe("/search");
  });

  it("keeps the root path unchanged", () => {
    expect(normalizePath("/")).toBe("/");
  });

  it("keeps paths without trailing slashes unchanged", () => {
    expect(normalizePath("/search")).toBe("/search");
  });

  it("removes only the final trailing slash", () => {
    expect(normalizePath("/papers/123/")).toBe("/papers/123");
  });
});

describe("getRouteId", () => {
  it("returns the route ID", () => {
    expect(getRouteId("/papers/123", "/papers")).toBe("123");
  });

  it("decodes encoded IDs", () => {
    expect(getRouteId("/papers/paper%20123", "/papers")).toBe("paper 123");
  });

  it("returns null when the path does not match", () => {
    expect(getRouteId("/search/123", "/papers")).toBeNull();
  });

  it("returns null when the ID is missing", () => {
    expect(getRouteId("/papers", "/papers")).toBeNull();
  });

  it("returns null when the path contains multiple IDs", () => {
    expect(getRouteId("/papers/123/456", "/papers")).toBeNull();
  });

  it("returns null for an invalid encoded ID", () => {
    expect(getRouteId("/papers/%E0%A4%A", "/papers")).toBeNull();
  });

  it("supports a trailing slash", () => {
    expect(getRouteId("/papers/123/", "/papers")).toBe("123");
  });
});

describe("paperPath", () => {
  it("creates a paper URL", () => {
    expect(paperPath("123")).toBe("/papers/123");
  });

  it("encodes special characters in the ID", () => {
    expect(paperPath("paper 123")).toBe("/papers/paper%20123");
  });

  it("encodes slashes in the ID", () => {
    expect(paperPath("a/b")).toBe("/papers/a%2Fb");
  });
});

describe("isAppRoute", () => {
  it("returns true for known application routes", () => {
    expect(isAppRoute("/")).toBe(true);
    expect(isAppRoute("/search")).toBe(true);
    expect(isAppRoute("/sign-in")).toBe(true);
    expect(isAppRoute("/sign-up")).toBe(true);
    expect(isAppRoute("/my-thread")).toBe(true);
    expect(isAppRoute("/profile")).toBe(true);
    expect(isAppRoute("/admin")).toBe(true);
    expect(isAppRoute("/papers")).toBe(true);
  });

  it("returns true for a paper details route", () => {
    expect(isAppRoute("/papers/123")).toBe(true);
  });

  it("supports trailing slashes", () => {
    expect(isAppRoute("/search/")).toBe(true);
  });

  it("returns false for unknown routes", () => {
    expect(isAppRoute("/unknown")).toBe(false);
  });

  it("returns false for nested paper routes", () => {
    expect(isAppRoute("/papers/123/extra")).toBe(false);
  });
});

describe("navigate", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.spyOn(window.history, "pushState");
    vi.spyOn(window.history, "replaceState");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "dispatchEvent");
  });

  it("navigates to an internal route", () => {
    navigate("/search");

    expect(window.location.pathname).toBe("/search");
    expect(window.history.pushState).toHaveBeenCalled();
  });

  it("supports replace navigation", () => {
    navigate("/profile", { replace: true });

    expect(window.location.pathname).toBe("/profile");
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("preserves query parameters and hash", () => {
    navigate("/search?q=black-hole#results");

    expect(window.location.pathname).toBe("/search");
    expect(window.location.search).toBe("?q=black-hole");
    expect(window.location.hash).toBe("#results");
  });

  it("scrolls to the top after normal navigation", () => {
    navigate("/search");

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
