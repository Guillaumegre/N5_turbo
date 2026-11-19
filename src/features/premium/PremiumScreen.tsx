import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useData, useSettings, useUpdateSetting } from '@/data/DataProvider';
import { wordStates } from '@/data/repo/cards';
import { words } from '@/data/vocab';
import { FREE_WORDS } from '@/domain/premium';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { notify } from '@/ui/dialogs';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';

import { runRestore, STORE } from './actions';
import { buy, loadOffer, type Offer } from './purchases';

const t = strings.premium;
const TOTAL = words.length;

/** The one-time unlock: what you get, the store's price, Buy and Restore purchases. */
export function PremiumScreen() {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { db } = useData();
  const { premium } = useSettings();
  const update = useUpdateSetting();
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined); // undefined = loading
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (premium) return;
    let live = true;
    loadOffer().then((o) => live && setOffer(o));
    return () => {
      live = false;
    };
  }, [premium]);

  const states = wordStates(db);
  const freeStarted = words.filter((w) => w.rank <= FREE_WORDS && (states.get(w.id) ?? 'new') !== 'new').length;

  const onBuy = async () => {
    if (!offer || busy) return;
    setBusy(true);
    try {
      const result = await buy(offer);
      if (result === 'bought') {
        update('premium', true);
        notify(t.thanksTitle, t.thanksBody(TOTAL));
      } else if (result === 'pending') {
        notify(t.pendingTitle, t.pendingBody);
      }
    } catch {
      notify(t.failTitle, t.failBody);
    } finally {
      setBusy(false);
    }
  };
  const onRestore = async () => {
    if (busy) return;
    setBusy(true);
    await runRestore((v) => update('premium', v));
    setBusy(false);
  };

  const hero = (
    <View style={[styles.hero, { backgroundColor: colors.inkCard }]}>
      <AppText style={styles.watermark} accessible={false}>全</AppText>
      <AppText style={[styles.eyebrow, { color: colors.onInkSoft }]}>{t.eyebrow}</AppText>
      <AppText style={[styles.heroTitle, { color: colors.onInk }]}>{premium ? t.activeTitle : t.heroTitle(TOTAL)}</AppText>
      <AppText style={[styles.heroSub, { color: colors.onInkSoft }]}>{premium ? t.activeBody(TOTAL) : t.heroSub}</AppText>
    </View>
  );

  if (premium) {
    return (
      <Screen title={t.title} titleJa={t.titleJa}>
        {hero}
      </Screen>
    );
  }

  const footer = (
    <View style={styles.footer}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !offer || busy }}
        disabled={!offer || busy}
        onPress={onBuy}
        style={({ pressed }) => [styles.buy, { backgroundColor: colors.accent }, (!offer || busy) && styles.disabled, pressed && styles.pressed]}>
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <AppText style={[styles.buyLabel, { color: colors.onAccent }]}>
            {offer ? t.buy(offer.priceString) : offer === undefined ? t.loading : t.buyFallback}
          </AppText>
        )}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onRestore} hitSlop={6} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}>
        <AppText muted style={styles.restoreLabel}>{t.restore}</AppText>
      </Pressable>
    </View>
  );

  return (
    <Screen title={t.title} titleJa={t.titleJa} footer={footer}>
      {hero}
      <View style={styles.benefits}>
        {t.benefits(TOTAL, FREE_WORDS).map((b) => (
          <View key={b} style={styles.benefit}>
            <View style={[styles.check, { backgroundColor: colors.surfaceMuted }]}>
              <Icon name="check" size={14} color={colors.good} />
            </View>
            <AppText style={styles.benefitText}>{b}</AppText>
          </View>
        ))}
      </View>
      <View style={[styles.free, { borderColor: colors.border }]}>
        <AppText muted style={styles.freeText}>{t.freeProgress(freeStarted, FREE_WORDS)}</AppText>
        <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
          <View style={[styles.fill, { backgroundColor: colors.accent, width: `${(freeStarted / FREE_WORDS) * 100}%` }]} />
        </View>
      </View>
      {offer === null ? <AppText muted style={styles.center}>{t.unavailable}</AppText> : null}
      <AppText variant="caption" faint style={styles.center}>
        {offer && !offer.pkg ? t.simulated : t.fineprint(STORE)}
      </AppText>
      {/* Words stay browsable for free: the list shows which ones the full version adds. */}
      <Pressable accessibilityRole="link" onPress={() => router.push('/words')} style={({ pressed }) => [styles.listLink, pressed && styles.pressed]}>
        <AppText style={[styles.listLinkText, { color: colors.accent }]}>{strings.home.wordList}</AppText>
        <Icon name="chevronRight" size={14} color={colors.accent} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', borderRadius: 28, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 24, gap: 6 },
  watermark: { position: 'absolute', right: -4, top: -28, fontFamily: fonts.mincho, fontSize: 150, lineHeight: 160, color: 'rgba(242,239,232,.06)' },
  eyebrow: { fontSize: 13, letterSpacing: 0.3 },
  heroTitle: { fontSize: 32, fontWeight: '300', letterSpacing: -0.8, lineHeight: 38 },
  heroSub: { fontSize: 15, lineHeight: 21 },
  benefits: { gap: 14 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 15, lineHeight: 21, paddingTop: 2 },
  free: { borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 10 },
  freeText: { fontSize: 14 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  center: { textAlign: 'center' },
  listLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
  listLinkText: { fontSize: 14, fontWeight: '500' },
  footer: { gap: 4 },
  buy: { minHeight: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buyLabel: { fontSize: 17, fontWeight: '500' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  restore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  restoreLabel: { fontSize: 14 },
});
