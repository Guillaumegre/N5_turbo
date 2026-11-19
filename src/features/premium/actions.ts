import { Platform } from 'react-native';

import { words } from '@/data/vocab';
import { strings } from '@/strings';
import { notify } from '@/ui/dialogs';

import { restore } from './purchases';

const t = strings.premium;

export const STORE = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';
const ACCOUNT = Platform.OS === 'ios' ? 'Apple' : 'Google';

/** Restore purchases, from the Premium screen or Settings. */
export async function runRestore(setPremium: (active: boolean) => void): Promise<boolean> {
  try {
    const active = await restore();
    if (active) {
      setPremium(true);
      notify(t.restoredTitle, t.thanksBody(words.length));
    } else {
      notify(t.notFoundTitle, t.notFoundBody(ACCOUNT));
    }
    return active;
  } catch {
    notify(t.restore, t.restoreFailBody);
    return false;
  }
}
