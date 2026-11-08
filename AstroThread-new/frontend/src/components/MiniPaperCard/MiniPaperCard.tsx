import type { PaperSummary } from "../../types/research";
import { formatShortCitation } from "../../lib/formatPaper";
import "./MiniPaperCard.css";

interface MiniPaperCardProps {
  paper: Pick<PaperSummary, "title" | "authors" | "year">;
  href: string;
}

export function MiniPaperCard({ paper, href }: MiniPaperCardProps) {
  return (
    <a className="mini-paper-card" href={href}>
      <span className="mini-paper-card__title">{paper.title}</span>
      <span className="mini-paper-card__meta">{formatShortCitation(paper)}</span>
    </a>
  );
}