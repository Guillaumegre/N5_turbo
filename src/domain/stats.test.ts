import { addStudyDays } from './srs/time';
import { answeredToday, answersPerDay, dueForecast, minutesStudied, retention, type LogEntry } from './stats';

const NOW = new Date(2026, 10, 17, 10, 0).getTime();
const H = 4; // study day starts at 4am
const day = (n: number) => addStudyDays(NOW, n, H) + 6 * 3600_000; // 10am, n days from today

const entry = (at: number, over: Partial<LogEntry> = {}): LogEntry => ({
  reviewedAt: at,
  rating: 3,
  kind: 'review',
  statusBefore: 'review',
  durationMs: 8000,
  ...over,
});

describe('stats', () => {
  it('counts answers per study day, today last', () => {
    const log = [entry(day(0)), entry(day(0)), entry(day(-2)), entry(day(-10))];
    expect(answersPerDay(log, NOW, H, 3)).toEqual([1, 0, 2]);
    expect(answeredToday(log, NOW, H)).toBe(2);
  });

  it('counts a 2am answer on the previous study day', () => {
    const twoAm = new Date(2026, 10, 17, 2, 0).getTime();
    expect(answersPerDay([entry(twoAm)], NOW, H, 2)).toEqual([1, 0]);
  });

  it('measures retention on known cards only', () => {
    const log = [
      entry(NOW, { rating: 1 }),
      entry(NOW, { rating: 3 }),
      entry(NOW, { rating: 4 }),
      entry(NOW, { rating: 4 }),
      entry(NOW, { rating: 1, statusBefore: 'learning' }), // learning step: ignored
      entry(NOW, { rating: 1, kind: 'practice' }), // practice: ignored
    ];
    expect(retention(log)).toBe(0.75);
    expect(retention([])).toBeNull();
  });

  it('caps idle answers at a minute', () => {
    expect(minutesStudied([entry(NOW, { durationMs: 30_000 }), entry(NOW, { durationMs: 600_000 })])).toBe(2);
  });

  it('forecasts reviews per day, overdue counted today, new cards left out', () => {
    const cards = [
      { status: 'review', due: day(-3) },
      { status: 'review', due: day(0) },
      { status: 'learning', due: NOW + 600_000 },
      { status: 'review', due: day(2) },
      { status: 'review', due: day(9) },
      { status: 'new', due: NOW },
    ];
    expect(dueForecast(cards, NOW, H, 3)).toEqual([3, 0, 1]);
  });
});
