import { DEFAULT_FILTER } from '@/domain/filters';

import type { Db } from '../db/client';
import { createTestDb } from '../db/testDb';
import { deletePreset, listPresets, savePreset } from './presets';

let db: Db;
beforeEach(async () => {
  db = await createTestDb();
});

describe('presets', () => {
  it('saves, lists in creation order, renames and deletes', () => {
    savePreset(db, { id: 'a', name: 'Colors', filter: { ...DEFAULT_FILTER, themes: ['colors'] } }, 1);
    savePreset(db, { id: 'b', name: 'Weak', filter: { ...DEFAULT_FILTER, weakOnly: true } }, 2);
    expect(listPresets(db).map((p) => p.name)).toEqual(['Colors', 'Weak']);
    expect(listPresets(db)[0].filter.themes).toEqual(['colors']);

    savePreset(db, { id: 'a', name: 'Colours', filter: DEFAULT_FILTER }, 3);
    expect(listPresets(db).map((p) => p.name)).toEqual(['Colours', 'Weak']);

    deletePreset(db, 'a', 4);
    expect(listPresets(db).map((p) => p.id)).toEqual(['b']);
  });
});
