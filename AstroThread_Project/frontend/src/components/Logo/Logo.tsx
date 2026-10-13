import logoMark from '../../assets/logo.svg'
import Link from '../../router/Link'
import { routes } from '../../router/router'
import './Logo.css'

interface LogoProps {
  /** The header and footer use different gaps between mark and wordmark. */
  variant?: 'header' | 'footer'
}

function Logo({ variant = 'header' }: LogoProps) {
  return (
    <Link className={`logo logo--${variant}`} href={routes.home} aria-label="AstroThread home">
      <img className="logo__mark" src={logoMark} alt="" width={56.5625} height={28.7629} />
      <span className="logo__text">ASTROTHREAD</span>
    </Link>
  )
}

export default Logo
