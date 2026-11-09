import { useEffect, useId, useRef, useState } from "react";
import logo from "../../assets/brand/astrothread-logo-full.svg";
import { routes, useLocation } from "../../lib/router";
import "./SiteHeader.css";

interface SiteHeaderProps {
  homeHref?: string;
  signInHref?: string;
  showMainNav?: boolean;
}

interface NavLinkItem {
  label: string;
  href?: string;
}

const exploreLinks: readonly NavLinkItem[] = [
  { label: "Search", href: routes.search },
  { label: "Thread Browser", href: routes.threads },
  { label: "Research Timeline" },
  { label: "Data Visualization" },
];

const allLinks: readonly NavLinkItem[] = [
  { label: "Home", href: routes.home },
  ...exploreLinks,
  { label: "AI Assistant" },
];

type OpenMenu = "explore" | "mobile" | null;

function MenuLinks({
  links,
  pathname,
}: {
  links: readonly NavLinkItem[];
  pathname: string;
}) {
  return (
    <ul className="site-header__menu-list">
      {links.map((link) => (
        <li key={link.label}>
          {link.href ? (
            <a
              className="site-header__menu-link"
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </a>
          ) : (
            <span className="site-header__menu-link site-header__menu-link--soon">
              {link.label}
              <span className="site-header__soon">Soon</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader({
  homeHref = "/",
  signInHref = "/sign-in",
  showMainNav = false,
}: SiteHeaderProps) {
  const { pathname } = useLocation();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const exploreMenuId = useId();
  const mobileMenuId = useId();
  const isExploreActive = exploreLinks.some((link) => link.href === pathname);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const trigger = navRef.current?.querySelector<HTMLButtonElement>(
          `[aria-expanded="true"]`,
        );
        setOpenMenu(null);
        trigger?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  function closeMenuAfterLinkClick(event: { target: EventTarget }) {
    if (event.target instanceof Element && event.target.closest("a")) {
      setOpenMenu(null);
    }
  }

  function toggleMenu(menu: Exclude<OpenMenu, null>) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  return (
    <header className={`site-header${showMainNav ? " site-header--with-nav" : ""}`}>
      <div className="site-header__inner">
        <a
          className="site-header__logo"
          href={homeHref}
          aria-label="AstroThread home"
        >
          <img src={logo} alt="" width={174} height={36} />
        </a>

        {showMainNav && (
          <div
            className="site-header__main-nav"
            ref={navRef}
            onClick={closeMenuAfterLinkClick}
          >
            <nav className="site-header__links" aria-label="Main">
              <a
                className="site-header__link"
                href={routes.home}
                aria-current={pathname === routes.home ? "page" : undefined}
              >
                Home
              </a>

              <div className="site-header__dropdown">
                <button
                  type="button"
                  className={`site-header__link${isExploreActive ? " site-header__link--active" : ""}`}
                  aria-expanded={openMenu === "explore"}
                  aria-controls={exploreMenuId}
                  onClick={() => toggleMenu("explore")}
                >
                  Explore
                  <svg className="site-header__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                <div
                  id={exploreMenuId}
                  className="site-header__menu"
                  hidden={openMenu !== "explore"}
                >
                  <MenuLinks links={exploreLinks} pathname={pathname} />
                </div>
              </div>

              <span className="site-header__link site-header__link--soon">
                AI Assistant
                <span className="site-header__soon">Soon</span>
              </span>
            </nav>

            <div className="site-header__dropdown site-header__mobile">
              <button
                type="button"
                className="site-header__link"
                aria-expanded={openMenu === "mobile"}
                aria-controls={mobileMenuId}
                onClick={() => toggleMenu("mobile")}
              >
                Menu
                <svg className="site-header__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              <nav
                id={mobileMenuId}
                className="site-header__menu site-header__menu--right"
                aria-label="Main"
                hidden={openMenu !== "mobile"}
              >
                <MenuLinks links={allLinks} pathname={pathname} />
              </nav>
            </div>
          </div>
        )}

        <nav aria-label="Account">
          <a className="site-header__sign-in" href={signInHref}>
            Sign In
          </a>
        </nav>
      </div>
    </header>
  );
}