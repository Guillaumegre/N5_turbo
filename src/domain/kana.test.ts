import { firstKana, kanaRow, lastKana, stripVoicing, toHiragana } from './kana';

describe('kana helpers', () => {
  it('converts katakana to hiragana and keeps ー', () => {
    expect(toHiragana('テレビ')).toBe('てれび');
    expect(toHiragana('コーヒー')).toBe('こーひー');
    expect(toHiragana('あか')).toBe('あか');
  });

  it('strips voicing marks', () => {
    expect(stripVoicing('がぱ')).toBe('かは');
  });

  it('maps kana to their row', () => {
    expect(kanaRow('あ')).toBe('a');
    expect(kanaRow('ガ')).toBe('ka');
    expect(kanaRow('ぷ')).toBe('ha');
    expect(kanaRow('ょ')).toBe('ya');
    expect(kanaRow('ん')).toBe('wa');
    expect(kanaRow('ー')).toBeNull();
  });

  it('finds first and last kana of a reading', () => {
    expect(firstKana('あかい')).toBe('あ');
    expect(lastKana('あかい')).toBe('い');
    expect(lastKana('テレビ')).toBe('び');
  });
});
