import type { FuriganaSegment } from '@/data/vocab';

/** Shared by Furigana.tsx (native) and Furigana.web.tsx: a separate file because on web
 *  `./Furigana` resolves to the .web file itself. */
export type FuriganaProps = {
  segments: FuriganaSegment[];
  size: number;
  showReading: boolean;
  color: string;
  readingColor: string;
  align?: 'left' | 'center';
  /** Base text weight (the card word is light). */
  weight?: '300' | '400';
};

export function plainText(segments: FuriganaSegment[]): string {
  return segments.map((s) => s.t).join('');
}
