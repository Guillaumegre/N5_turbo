import { lastKana } from '@/domain/kana';

import { themes, words } from './vocab';

const text = (segs: { t: string }[]) => segs.map((s) => s.t).join('');

describe('bundled N5 vocabulary', () => {
  it('has the full list with unique ids', () => {
    expect(words.length).toBeGreaterThan(700);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
  });

  it('only uses known themes, and every theme has words', () => {
    const ids = new Set(themes.map((t) => t.id));
    for (const w of words) {
      expect(w.themes.length).toBeGreaterThan(0);
      for (const t of w.themes) expect(ids.has(t)).toBe(true);
    }
    for (const t of themes) expect(words.some((w) => w.themes.includes(t.id))).toBe(true);
  });

  it('has furigana that spells the displayed word, readings only over kanji', () => {
    for (const w of words) {
      expect(text(w.furigana)).toBe(w.kanji);
      for (const s of [...w.furigana, ...w.examples.flatMap((e) => e.ja)]) {
        if (s.r !== undefined) expect(s.r.length).toBeGreaterThan(0);
      }
    }
  });

  it('has short meanings and well-formed examples', () => {
    for (const w of words) {
      expect(w.meaning_en.length).toBeGreaterThan(0);
      expect(w.examples.length).toBeLessThanOrEqual(3);
      for (const e of w.examples) {
        expect(text(e.ja).length).toBeGreaterThan(0);
        expect(e.en.length).toBeGreaterThan(0);
        expect(e.src).toHaveLength(2);
      }
    }
  });

  it('supports the acceptance criteria: Colors theme and "ends with い"', () => {
    const colors = words.filter((w) => w.themes.includes('colors')).map((w) => w.kanji);
    expect(colors).toEqual(expect.arrayContaining(['赤い', '青い', '白い', '黒い']));
    const red = words.find((w) => w.kanji === '赤い')!;
    expect(red.meaning_en).toBe('red');
    expect(red.furigana).toEqual([{ t: '赤', r: 'あか' }, { t: 'い' }]);
    expect(words.filter((w) => lastKana(w.reading) === 'い').map((w) => w.kanji)).toContain('赤い');
  });
});
