import logo from "../../assets/brand/astrothread-logo-full-dark.svg";
import "./SiteFooter.css";

interface SiteFooterProps {
  homeHref?: string;
  projectName?: string;
}

export function SiteFooter({
  homeHref = "/",
  projectName = "AstroThread graduation project",
}: SiteFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <a
          className="site-footer__logo"
          href={homeHref}
          aria-label="AstroThread home"
        >
          <img src={logo} alt="" width={174} height={36} />
        </a>

        <p className="site-footer__copyright">
          <small>
            &copy; {currentYear} AstroThread. {projectName}.
          </small>
        </p>
      </div>
    </footer>
  );
}