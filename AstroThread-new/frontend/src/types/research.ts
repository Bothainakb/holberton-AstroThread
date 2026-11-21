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

export interface ResearchThread {
  id: string;
  title: string;
  topic: string;
  summary: string;
  paperIds: string[];
}

export interface ThreadSummary extends ResearchThread {
  paperCount: number;
  firstYear: number;
  lastYear: number;
}

export interface SpaceImage {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  imageUrl: string;
  pageUrl: string;
  credit: string;
  date: string;
}