import Link from '../../router/Link'
import { routes } from '../../router/router'
import Logo from '../Logo/Logo'
import './Footer.css'

const footerLinks = [
  { label: 'Home', href: routes.home },
  { label: 'Research Threads', href: routes.researchThreads },
  { label: 'Search', href: routes.researchSearch },
  { label: 'Profile', href: '#' },
]

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <div className="footer__brand">
          <Logo variant="footer" />
          <p className="footer__description">
            An interactive platform that traces how discoveries in astronomy and physics connect
            over time.
          </p>
          <p className="footer__copyright">© 2026 AstroThread. Source: Scientific Papers.</p>
        </div>

        <nav className="footer__links" aria-label="Footer">
          {footerLinks.map((link) => (
            <Link key={link.label} className="footer__link" href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export default Footer
