import { useEffect, useRef } from 'react';

import { useSettings, useUpdateSetting } from '@/data/DataProvider';

import { watchPremium } from './purchases';

/** Keeps the saved premium flag in step with the store (purchase, restore, refund). Mounted once at the root. */
export function usePremiumSync() {
  const { premium } = useSettings();
  const update = useUpdateSetting();
  // The listener outlives renders: read the latest values through refs.
  const latest = useRef({ premium, update });
  useEffect(() => {
    latest.current = { premium, update };
  });
  useEffect(
    () =>
      watchPremium((active) => {
        if (active !== latest.current.premium) latest.current.update('premium', active);
      }),
    [],
  );
}
