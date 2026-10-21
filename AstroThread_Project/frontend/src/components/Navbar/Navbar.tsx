import searchIcon from '../../assets/icons/search.svg'
import userIcon from '../../assets/icons/user.svg'
import { signOut, useAuth } from '../../auth/auth'
import Link from '../../router/Link'
import { navigate, routes } from '../../router/router'
import Logo from '../Logo/Logo'
import './Navbar.css'

interface NavLink {
  label: string
  href: string
  /** "Plans" is marked optional in Figma and shown in a dimmer color. */
  optional?: boolean
}

const navLinks: NavLink[] = [
  { label: 'Home', href: routes.home },
  { label: 'Research Threads', href: routes.researchThreads },
  { label: 'AI Assistant', href: '#' },
  { label: 'Plans', href: '#', optional: true },
]

interface NavbarProps {
  activeHref?: string
}

function Navbar({ activeHref = routes.home }: NavbarProps) {
  const auth = useAuth()
  const user = auth.status === 'signed-in' ? auth.user : null

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // The UI is already signed out; the server rejects the old cookie
      // once it expires.
    }
    navigate(routes.home)
  }

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Logo />

        <nav className="navbar__links" aria-label="Main">
          {navLinks.map((link) => {
            const isActive = link.href === activeHref
            const classes = [
              'navbar__link',
              isActive && 'navbar__link--active',
              link.optional && 'navbar__link--optional',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <Link
                key={link.label}
                className={classes}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="navbar__actions">
          <Link
            className="navbar__icon-button"
            href={routes.researchSearch}
            aria-label="Search"
            aria-current={activeHref === routes.researchSearch ? 'page' : undefined}
          >
            <img src={searchIcon} alt="" width={17.25} height={17.25} />
          </Link>
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
          {user ? (
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
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
