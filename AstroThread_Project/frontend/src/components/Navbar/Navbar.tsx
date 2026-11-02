import { useEffect, useId, useRef, useState } from 'react'
import { signOut, useAuth } from '../../auth/auth'
import Link from '../../router/Link'
import { navigate, routes } from '../../router/router'
import type { AuthUser } from '../../services/api'
import { initialsFor, shortName } from '../../services/profileFormat'
import Logo from '../Logo/Logo'
import './Navbar.css'

interface NavLink {
  label: string
  href: string
}

// Figma "02-Login" header order. Search is reached from the footer and pages.
const navLinks: NavLink[] = [
  { label: 'Home', href: routes.home },
  { label: 'Browse Threads', href: routes.researchThreads },
  { label: 'Plans', href: '#' },
  { label: 'AI Assistant', href: '#' },
]

interface NavbarProps {
  activeHref?: string
  /**
   * "minimal" is Figma "01-Home": no bar, only the outlined Sign In pill at
   * the top right. "full" is the header of every other frame.
   */
  variant?: 'full' | 'minimal'
}

function Navbar({ activeHref = routes.home, variant = 'full' }: NavbarProps) {
  const auth = useAuth()
  const user = auth.status === 'signed-in' ? auth.user : null
  const minimal = variant === 'minimal'

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // The UI is already signed out; the server rejects the old cookie
      // once it expires.
    }
    navigate(routes.home)
  }

  const authControl = user ? (
    <UserMenu user={user} onSignOut={handleSignOut} />
  ) : (
    <Link
      className={[
        'navbar__login',
        activeHref === routes.login && 'navbar__login--active',
        // Hidden (but keeping its space) until the session check finishes.
        auth.status === 'loading' && 'navbar__login--pending',
      ]
        .filter(Boolean)
        .join(' ')}
      href={routes.login}
      aria-current={activeHref === routes.login ? 'page' : undefined}
    >
      {minimal ? 'Sign In' : 'Login'}
    </Link>
  )

  if (minimal) {
    return (
      <header className="navbar navbar--minimal">
        <div className="navbar__inner">{authControl}</div>
      </header>
    )
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Logo />

        <nav className="navbar__links" aria-label="Main">
          {navLinks.map((link) => {
            const isActive = link.href === activeHref
            return (
              <Link
                key={link.label}
                className={isActive ? 'navbar__link navbar__link--active' : 'navbar__link'}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="navbar__actions">
          {/* Display only: admin access (the `owner` role) is checked by the backend. */}
          {user?.role === 'owner' && <span className="navbar__role">Admin</span>}
          {authControl}
        </div>
      </div>
    </header>
  )
}

/**
 * Figma "08-Profile" header: initials, first name and a chevron. Opens a
 * small menu with Profile and Log out. The name comes from the email, since
 * the auth endpoints return only id, email and role.
 */
function UserMenu({ user, onSignOut }: { user: AuthUser; onSignOut: () => void }) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="navbar__user" ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="navbar__user-button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${user.email}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="navbar__user-initials" aria-hidden="true">
          {initialsFor(null, user.email)}
        </span>
        <span className="navbar__user-name">{shortName(null, user.email)}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="navbar__user-chevron">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="navbar__user-menu" id={menuId}>
          <Link className="navbar__user-item" href={routes.profile} onClick={() => setOpen(false)}>
            Profile
          </Link>
          <button
            type="button"
            className="navbar__user-item navbar__user-item--danger"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}

export default Navbar
