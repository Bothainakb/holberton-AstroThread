import { useId } from "react";
import type { ReactNode } from "react";
import "./InfoPanel.css";

interface InfoPanelProps {
  title: string;
  description?: string;
  children: ReactNode;
}

interface InfoPanelSectionProps {
  title: string;
  children: ReactNode;
}

export function InfoPanel({ title, description, children }: InfoPanelProps) {
  const titleId = useId();

  return (
    <section className="info-panel" aria-labelledby={titleId}>
      <div className="info-panel__header">
        <h2 id={titleId} className="info-panel__title">
          {title}
        </h2>
        {description && <p className="info-panel__description">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function InfoPanelSection({ title, children }: InfoPanelSectionProps) {
  const titleId = useId();

  return (
    <section className="info-panel__section" aria-labelledby={titleId}>
      <h3 id={titleId} className="info-panel__section-title">
        {title}
      </h3>
      {children}
    </section>
  );
}