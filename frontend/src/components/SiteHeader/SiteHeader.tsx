import logo from "../../assets/brand/astrothread-logo-full.svg";
import "./SiteHeader.css";

interface SiteHeaderProps {
  homeHref?: string;
  signInHref?: string;
}

export function SiteHeader({
  homeHref = "/",
  signInHref = "/sign-in",
}: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a
          className="site-header__logo"
          href={homeHref}
          aria-label="AstroThread home"
        >
          <img src={logo} alt="" width={174} height={36} />
        </a>

        <nav aria-label="Account">
          <a className="site-header__sign-in" href={signInHref}>
            Sign In
          </a>
        </nav>
      </div>
    </header>
  );
}