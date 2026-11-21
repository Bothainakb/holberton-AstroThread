import "./SiteFooter.css";

interface SiteFooterProps {
  note?: string;
}

const DEFAULT_NOTE =
  "Searches astronomy and physics papers. Every result links to its original source.";

export function SiteFooter({ note = DEFAULT_NOTE }: SiteFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__note">{note}</p>
        <p className="site-footer__copyright">
          <small>&copy; {currentYear} AstroThread</small>
        </p>
      </div>
    </footer>
  );
}