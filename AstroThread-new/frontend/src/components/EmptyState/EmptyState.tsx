import type { ReactNode } from "react";
import "./EmptyState.css";

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  headingLevel?: "h1" | "h2";
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actions,
  headingLevel = "h2",
  icon,
}: EmptyStateProps) {
  const Heading = headingLevel;

  return (
    <div className="empty-state">
      {icon && (
        <div className="empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className="empty-state__title">{title}</Heading>
      <p className="empty-state__description">{description}</p>
      {actions && <div className="empty-state__actions">{actions}</div>}
    </div>
  );
}