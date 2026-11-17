import { tallyWords, wordState } from './progress';

describe('word progress', () => {
  it('classifies a word from its JP → EN card', () => {
    expect(wordState(undefined)).toBe('new');
    expect(wordState({ status: 'new', interval: 0 })).toBe('new');
    expect(wordState({ status: 'learning', interval: 0 })).toBe('learning');
    expect(wordState({ status: 'review', interval: 5 })).toBe('learning');
    expect(wordState({ status: 'review', interval: 30 })).toBe('mastered');
  });

  it('tallies words overall and by part of speech', () => {
    const words = [
      { id: 'a', pos: 'verb' },
      { id: 'b', pos: 'verb' },
      { id: 'c', pos: 'noun' },
      { id: 'd', pos: 'pronoun' },
    ];
    const { all, byPos } = tallyWords(words, new Map([['a', 'mastered'], ['c', 'learning']]));
    expect(all).toEqual({ new: 2, learning: 1, mastered: 1, total: 4 });
    expect(byPos.get('verb')).toEqual({ new: 1, learning: 0, mastered: 1, total: 2 });
    expect(byPos.get('other')?.total).toBe(1);
  });
});
