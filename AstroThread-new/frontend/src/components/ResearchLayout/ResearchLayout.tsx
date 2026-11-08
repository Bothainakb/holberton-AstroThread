import type { ReactNode } from "react";
import { SiteHeader } from "../SiteHeader/SiteHeader";
import { SiteFooter } from "../SiteFooter/SiteFooter";
import "./ResearchLayout.css";

interface ResearchLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  rail?: ReactNode;
  sidebarLabel?: string;
}

export function ResearchLayout({
  children,
  sidebar,
  rail,
  sidebarLabel = "Page details",
}: ResearchLayoutProps) {
  const layoutClassName = [
    "research-layout__grid",
    sidebar ? "research-layout__grid--with-sidebar" : "",
    rail ? "research-layout__grid--with-rail" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="research-layout">
      <SiteHeader showMainNav />

      <main className="research-layout__main">
        <div className={layoutClassName}>
          {sidebar && (
            <aside className="research-layout__sidebar" aria-label={sidebarLabel}>
              {sidebar}
            </aside>
          )}

          <div className="research-layout__content">{children}</div>

          {rail && <div className="research-layout__rail">{rail}</div>}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}