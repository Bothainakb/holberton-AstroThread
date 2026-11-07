import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { SiteHeader } from "../SiteHeader/SiteHeader";
import { SiteFooter } from "../SiteFooter/SiteFooter";
import logoOnDark from "../../assets/brand/astrothread-logo-full-dark.svg";
import "./AuthLayout.css";

interface AuthLayoutProps {
  pageTitle: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  pageTitle,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${pageTitle} | AstroThread`;
    headingRef.current?.focus();
  }, [pageTitle]);

  return (
    <div className="auth-layout">
      <SiteHeader />

      <main className="auth-layout__main">
        <div className="auth-layout__panel">
          <div className="auth-layout__panel-content">
            <img
              className="auth-layout__panel-logo"
              src={logoOnDark}
              alt=""
              width={174}
              height={36}
            />
            <p className="auth-layout__panel-title">
              Pick up where your research left off.
            </p>
            <p className="auth-layout__panel-text">
              Save threads and papers, keep your recent research together, and
              manage your plan.
            </p>
          </div>
        </div>

        <div className="auth-layout__content">
          <section className="auth-layout__card" aria-labelledby="auth-title">
            <h1
              id="auth-title"
              ref={headingRef}
              className="auth-layout__title"
              tabIndex={-1}
            >
              {title}
            </h1>
            <p className="auth-layout__description">{description}</p>

            <div className="auth-layout__body">{children}</div>

            {footer && <div className="auth-layout__footer">{footer}</div>}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}