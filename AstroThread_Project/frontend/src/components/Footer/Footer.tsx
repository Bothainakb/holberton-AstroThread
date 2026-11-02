import Logo from '../Logo/Logo'
import './Footer.css'

/** Shared footer: the AstroThread logo (a link to Home) and the platform text, on every page. */
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
      </div>
    </footer>
  )
}

export default Footer
