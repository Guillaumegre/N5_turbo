import { and, asc, eq } from 'drizzle-orm';

import { normalizeFilter, type Filter } from '@/domain/filters';

import type { Db } from '../db/client';
import { presets } from '../db/schema';

export type Preset = { id: string; name: string; filter: Filter };

/** Saved filter combinations, oldest first. Deleted presets stay as tombstones (for sync). */
export function listPresets(db: Db): Preset[] {
  return db
    .select()
    .from(presets)
    .where(eq(presets.deleted, 0))
    .orderBy(asc(presets.createdAt))
    .all()
    .map((row) => {
      let filter: Filter;
      try {
        filter = normalizeFilter(JSON.parse(row.filter));
      } catch {
        filter = normalizeFilter(null);
      }
      return { id: row.id, name: row.name, filter };
    });
}

export function savePreset(db: Db, p: Preset, now: number): void {
  const filter = JSON.stringify(p.filter);
  db.insert(presets)
    .values({ id: p.id, name: p.name, filter, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: presets.id, set: { name: p.name, filter, deleted: 0, updatedAt: now } })
    .run();
}

export function deletePreset(db: Db, id: string, now: number): void {
  db.update(presets).set({ deleted: 1, updatedAt: now }).where(and(eq(presets.id, id), eq(presets.deleted, 0))).run();
}
