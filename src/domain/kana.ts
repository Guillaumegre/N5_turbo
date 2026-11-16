/**
 * Kana helpers used by the "starts with / ends with" filters.
 * Filters always operate on the reading, normalised to hiragana.
 */

const KATAKANA_START = 0x30a1; // ァ
const KATAKANA_END = 0x30f6; // ヶ
const KANA_OFFSET = 0x60;

/** Converts katakana to hiragana; leaves everything else (incl. ー) untouched. */
export function toHiragana(text: string): string {
  let out = '';
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    out += code >= KATAKANA_START && code <= KATAKANA_END ? String.fromCodePoint(code - KANA_OFFSET) : ch;
  }
  return out;
}

/** Strips dakuten/handakuten: が→か, ぱ→は. */
export function stripVoicing(kana: string): string {
  return kana.normalize('NFD').replace(/[゙゚]/g, '').normalize('NFC');
}

const SMALL_TO_LARGE: Record<string, string> = {
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', っ: 'つ', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', ゎ: 'わ',
};

export const KANA_ROWS = {
  a: 'あいうえお',
  ka: 'かきくけこ',
  sa: 'さしすせそ',
  ta: 'たちつてと',
  na: 'なにぬねの',
  ha: 'はひふへほ',
  ma: 'まみむめも',
  ya: 'やゆよ',
  ra: 'らりるれろ',
  wa: 'わをん',
} as const;

export type KanaRow = keyof typeof KANA_ROWS;

/** Row (あ行, か行…) of a single kana. Voiced kana belong to their base row (が → か行). */
export function kanaRow(kana: string): KanaRow | null {
  const base = stripVoicing(toHiragana(kana));
  const normalized = SMALL_TO_LARGE[base] ?? base;
  for (const [row, chars] of Object.entries(KANA_ROWS) as [KanaRow, string][]) {
    if (chars.includes(normalized)) return row;
  }
  return null;
}

export function firstKana(reading: string): string {
  return [...toHiragana(reading)][0] ?? '';
}

export function lastKana(reading: string): string {
  const chars = [...toHiragana(reading)];
  return chars[chars.length - 1] ?? '';
}
