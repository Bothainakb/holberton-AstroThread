import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { SiteHeader } from "../SiteHeader/SiteHeader";
import { SiteFooter } from "../SiteFooter/SiteFooter";
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
      </main>

      <SiteFooter />
    </div>
  );
}