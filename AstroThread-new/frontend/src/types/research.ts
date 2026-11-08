export type PaperType = "observational" | "theoretical";

export interface PaperSummary {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  topic: string;
  paperType: PaperType;
  keywords: string[];
  abstract: string;
}

export interface PaperDetails extends PaperSummary {
  method: string;
  mainFinding: string;
  whyItMatters: string;
}