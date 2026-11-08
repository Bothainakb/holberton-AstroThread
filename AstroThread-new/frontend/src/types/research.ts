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