export type ExtractionSource =
  | "temporary-rule"
  | "user-rule"
  | "builtin-rule"
  | "readability";

export interface Article {
  title: string;
  byline: string | null;
  publishedTime: string | null;
  siteName: string | null;
  excerpt: string | null;
  leadImage: string | null;
  contentHtml: string;
  textContent: string;
  sourceUrl: string;
  readingMinutes: number;
}

export interface ExtractionWarning {
  source: ExtractionSource;
  message: string;
}

export type ExtractionResult =
  | {
      ok: true;
      article: Article;
      source: ExtractionSource;
      warnings: ExtractionWarning[];
    }
  | {
      ok: false;
      error: "NO_ARTICLE" | "LOW_QUALITY" | "INVALID_RULE";
      warnings: ExtractionWarning[];
    };

export function readingMinutes(text: string): number {
  const latinWords = text.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  const cjkCharacters = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return Math.max(1, Math.ceil(latinWords / 220 + cjkCharacters / 400));
}

