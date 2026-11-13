
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import logoIcon from "../../assets/brand/astrothread-icon.svg";
import { getCurrentSession, signOut } from "../../data/demoAuth";
import type { DemoSession } from "../../data/demoAuth";
import { navigate, routes, useLocation } from "../../lib/router";
import "./SiteHeader.css";

interface SiteHeaderProps {
  homeHref?: string;
  signInHref?: string;
  showBrand?: boolean;
  search?: ReactNode;
}

function UserIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function ThreadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 18c3 0 3-12 6-12s3 12 6 12 2.5-6 4-6" />
      <circle cx="4" cy="18" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function getInitials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface AccountMenuProps {
  session: DemoSession;
  onSignOut: () => void;
}

function AccountMenu({ session, onSignOut }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSignOut() {
    signOut();
    setIsOpen(false);
    onSignOut();
    navigate(routes.home);
  }

  return (
    <div className="account-menu" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="account-menu__button"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={`Account menu for ${session.fullName}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        {getInitials(session.fullName)}
      </button>

      <div id={menuId} className="account-menu__panel" hidden={!isOpen}>
        <div className="account-menu__who">
          <p className="account-menu__name">{session.fullName}</p>
          <p className="account-menu__email">{session.email}</p>
          {session.accountType === "admin" && (
            <span className="account-menu__badge">Admin</span>
          )}
        </div>

        <ul className="account-menu__list">
          <li>
            <a className="account-menu__item" href={routes.myThread}>
              My Thread
            </a>
          </li>
          <li>
            <button
              type="button"
              className="account-menu__item"
              onClick={handleSignOut}
            >
              Log out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function SiteHeader({
  homeHref = routes.home,
  signInHref = routes.signIn,
  showBrand,
  search,
}: SiteHeaderProps) {
  const { pathname } = useLocation();
  const [session, setSession] = useState(getCurrentSession);
  const isBrandVisible = showBrand ?? pathname !== routes.home;
  const isAuthPage =
    pathname === routes.signIn || pathname === routes.signUp;

  let account: ReactNode;

  if (isAuthPage) {
    account = (
      <a className="site-header__cancel" href={homeHref}>
        Cancel
      </a>
    );
  } else if (session) {
    account = (
      <>
        <a
          className="site-header__thread-link"
          href={routes.myThread}
          aria-label="My Thread"
          aria-current={pathname === routes.myThread ? "page" : undefined}
        >
          <ThreadIcon />
          <span>My Thread</span>
        </a>
        <AccountMenu
          session={session}
          onSignOut={() => setSession(null)}
        />
      </>
    );
  } else {
    account = (
      <a className="site-header__login" href={signInHref}>
        <UserIcon />
        <span>Log in</span>
      </a>
    );
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        {isBrandVisible && (
          <a className="site-header__brand" href={homeHref}>
            <img
              className="site-header__brand-icon"
              src={logoIcon}
              alt=""
              width={40}
              height={40}
            />
            <span className="site-header__brand-text">
              <span className="site-header__brand-name">AstroThread</span>
              <span className="site-header__brand-tagline">
                Research Explorer
              </span>
            </span>
          </a>
        )}

        {search && <div className="site-header__search">{search}</div>}

        <nav className="site-header__account" aria-label="Account">
          {account}
        </nav>
      </div>
    </header>
  );
}
