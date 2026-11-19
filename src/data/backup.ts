/**
 * Progress backup: one JSON file with every card's schedule, the review log, settings and
 * presets. Export writes it; import replaces this device's progress with it.
 *
 * Words are identified by their stable ids, so a backup made with an older word list still
 * imports: cards unknown to this version are skipped, cards missing from the backup start new.
 */
import { sql } from 'drizzle-orm';

import type { Scheduler } from '@/domain/srs/scheduler';

import type { Db } from './db/client';
import { cards, presets, revlog, settings } from './db/schema';

export const BACKUP_APP = 'n5turbo';
export const BACKUP_VERSION = 1;

type CardRow = typeof cards.$inferSelect;
type RevlogRow = typeof revlog.$inferSelect;
type SettingRow = typeof settings.$inferSelect;
type PresetRow = typeof presets.$inferSelect;

export type Backup = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  /** Only cards that have been studied: new cards are the default state. */
  cards: CardRow[];
  revlog: RevlogRow[];
  settings: SettingRow[];
  presets: PresetRow[];
};

export class BackupError extends Error {}

/** The premium flag stays on the phone (a backup file must not unlock premium). */
const LOCAL_ONLY = 'premium';

export function exportBackup(db: Db, now: number): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now,
    cards: db.select().from(cards).where(sql`${cards.status} != 'new'`).all(),
    revlog: db.select().from(revlog).all(),
    settings: db.select().from(settings).where(sql`${settings.key} != ${LOCAL_ONLY}`).all(),
    presets: db.select().from(presets).all(),
  };
}

/** "n5-turbo-backup-2026-11-17.json" */
export function backupFileName(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `n5-turbo-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parses and checks a backup file. Throws BackupError with a user-facing reason. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('notBackup');
  }
  if (!isObject(data) || data.app !== BACKUP_APP) throw new BackupError('notBackup');
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) throw new BackupError('newerVersion');
  for (const key of ['cards', 'revlog', 'settings', 'presets'] as const) {
    if (!Array.isArray(data[key]) || !(data[key] as unknown[]).every(isObject)) throw new BackupError('damaged');
  }
  const okCard = (c: Record<string, unknown>) =>
    typeof c.id === 'string' && typeof c.status === 'string' && typeof c.due === 'number' && typeof c.interval === 'number';
  const okLog = (r: Record<string, unknown>) =>
    typeof r.id === 'string' && typeof r.cardId === 'string' && typeof r.reviewedAt === 'number' && typeof r.rating === 'number';
  if (!(data.cards as Record<string, unknown>[]).every(okCard) || !(data.revlog as Record<string, unknown>[]).every(okLog)) {
    throw new BackupError('damaged');
  }
  return data as unknown as Backup;
}

export type ImportSummary = { cards: number; reviews: number };

/**
 * Replaces all progress with the backup's, in one transaction: every card back to new, then the
 * backup's cards (known ids only), its review log, settings and presets.
 */
export function importBackup(db: Db, backup: Backup, scheduler: Scheduler, now: number): ImportSummary {
  const fresh = scheduler.newCard(now);
  const known = new Set(db.select({ id: cards.id }).from(cards).all().map((r) => r.id));
  const backupCards = backup.cards.filter((c) => known.has(c.id));
  return db.transaction((tx) => {
    tx.update(cards)
      .set({
        status: fresh.status,
        due: fresh.due,
        interval: fresh.interval,
        ease: fresh.ease,
        step: fresh.step,
        reps: fresh.reps,
        lapses: fresh.lapses,
        againCount: fresh.againCount,
        updatedAt: now,
      })
      .run();
    for (const c of backupCards) {
      tx.update(cards)
        .set({
          status: c.status,
          due: c.due,
          interval: c.interval,
          ease: c.ease,
          step: c.step,
          reps: c.reps,
          lapses: c.lapses,
          againCount: c.againCount,
          updatedAt: now,
        })
        .where(sql`${cards.id} = ${c.id}`)
        .run();
    }
    tx.delete(revlog).run();
    for (let i = 0; i < backup.revlog.length; i += 50) tx.insert(revlog).values(backup.revlog.slice(i, i + 50)).run();
    // Premium comes from the store, never from a file: keep this phone's own value.
    tx.delete(settings).where(sql`${settings.key} != ${LOCAL_ONLY}`).run();
    const imported = backup.settings.filter((s) => s.key !== LOCAL_ONLY);
    if (imported.length) tx.insert(settings).values(imported).run();
    tx.delete(presets).run();
    if (backup.presets.length) tx.insert(presets).values(backup.presets).run();
    return { cards: backupCards.length, reviews: backup.revlog.filter((r) => !r.deleted).length };
  });
}
