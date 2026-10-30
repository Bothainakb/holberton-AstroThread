import userIcon from '../../assets/icons/user.svg'
import { signOut, useAuth } from '../../auth/auth'
import Link from '../../router/Link'
import { navigate, routes } from '../../router/router'
import Logo from '../Logo/Logo'
import './Navbar.css'

interface NavLink {
  label: string
  href: string
}

// Figma "02-Login" header order. Search is reached from the footer and pages.
const navLinks: NavLink[] = [
  { label: 'Home', href: routes.home },
  { label: 'Research Threads', href: routes.researchThreads },
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
    <button type="button" className="navbar__login" onClick={handleSignOut}>
      Log out
    </button>
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
          <a
            className="navbar__icon-button"
            href="#"
            aria-label={user ? `Profile (signed in as ${user.email})` : 'Profile'}
            title={user ? `Signed in as ${user.email}` : undefined}
          >
            <img src={userIcon} alt="" width={16.7505} height={17.7502} />
          </a>
          {/* Display only: owner access is checked by the backend. */}
          {user?.role === 'owner' && <span className="navbar__role">Owner</span>}
          {authControl}
        </div>
      </div>
    </header>
  )
}

export default Navbar
