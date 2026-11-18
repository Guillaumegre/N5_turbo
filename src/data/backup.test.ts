import { DEFAULT_FILTER } from '@/domain/filters';
import { AnkiV2Scheduler } from '@/domain/srs/scheduler';
import { DEFAULT_CONFIG } from '@/domain/srs/types';

import { backupFileName, BackupError, exportBackup, importBackup, parseBackup } from './backup';
import type { Db } from './db/client';
import { createTestDb } from './db/testDb';
import { allCards, answerCard, cardId, getCard, reviewLog, seedCards } from './repo/cards';
import { listPresets, savePreset } from './repo/presets';
import { getSetting, setSetting } from './repo/settings';
import { words } from './vocab';

const NOW = new Date(2026, 10, 17, 10, 0).getTime();
const scheduler = new AnkiV2Scheduler(DEFAULT_CONFIG, () => 0.5);
let n = 0;
const newId = () => `rev-${++n}`;

async function freshDb(): Promise<Db> {
  const db = await createTestDb();
  seedCards(db, words, scheduler, NOW);
  return db;
}

const a = cardId(words[0].id, 'recognition');
const b = cardId(words[1].id, 'recognition');
const answer = (db: Db, id: string, rating: 1 | 2 | 3 | 4) =>
  answerCard(db, { cardId: id, rating, now: NOW, durationMs: 5000, kind: 'review', scheduler, newId });

describe('backup', () => {
  it('round-trips progress, history, settings and presets into another database', async () => {
    const source = await freshDb();
    answer(source, a, 4);
    answer(source, b, 3);
    setSetting(source, 'goalDeadline', NOW + 90 * 86_400_000, NOW);
    savePreset(source, { id: 'p1', name: 'Colors', filter: { ...DEFAULT_FILTER, themes: ['colors'] } }, NOW);
    const text = JSON.stringify(exportBackup(source, NOW));

    const target = await freshDb();
    answer(target, b, 1); // progress on the target is replaced, not merged
    const summary = importBackup(target, parseBackup(text), scheduler, NOW + 1000);

    expect(summary).toEqual({ cards: 2, reviews: 2 });
    expect(getCard(target, a)).toMatchObject({ status: getCard(source, a)!.status, interval: getCard(source, a)!.interval });
    expect(getCard(target, b)).toMatchObject({ status: getCard(source, b)!.status, step: getCard(source, b)!.step });
    expect(allCards(target).filter((c) => c.status !== 'new')).toHaveLength(2);
    expect(reviewLog(target, 0)).toHaveLength(2);
    expect(getSetting(target, 'goalDeadline')).toBe(NOW + 90 * 86_400_000);
    expect(listPresets(target).map((p) => p.name)).toEqual(['Colors']);
  });

  it('exports only studied cards', async () => {
    const db = await freshDb();
    answer(db, a, 3);
    expect(exportBackup(db, NOW).cards.map((c) => c.id)).toEqual([a]);
  });

  it('skips cards this version does not know', async () => {
    const source = await freshDb();
    answer(source, a, 4);
    const backup = exportBackup(source, NOW);
    backup.cards.push({ ...backup.cards[0], id: 'gone-word|r' });
    const target = await freshDb();
    expect(importBackup(target, backup, scheduler, NOW).cards).toBe(1);
  });

  it('rejects files that are not backups, damaged or from a newer app', () => {
    const reason = (text: string) => {
      try {
        parseBackup(text);
        return 'ok';
      } catch (e) {
        return e instanceof BackupError ? e.message : 'other';
      }
    };
    expect(reason('hello')).toBe('notBackup');
    expect(reason('{"app":"anki"}')).toBe('notBackup');
    expect(reason('{"app":"n5turbo","version":99}')).toBe('newerVersion');
    expect(reason('{"app":"n5turbo","version":1,"cards":[{"id":1}],"revlog":[],"settings":[],"presets":[]}')).toBe('damaged');
    expect(reason('{"app":"n5turbo","version":1,"cards":[],"revlog":[],"settings":[],"presets":[]}')).toBe('ok');
  });

  it('names the file after the day', () => {
    expect(backupFileName(NOW)).toBe('n5-turbo-backup-2026-11-17.json');
  });
});
