import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { customSessionQueue } from '@/data/custom';
import { useData, useSettings, useUpdateSetting } from '@/data/DataProvider';
import { deletePreset, listPresets, savePreset, type Preset } from '@/data/repo/presets';
import { themeName, words } from '@/data/vocab';
import {
  DEFAULT_FILTER,
  filtersEqual,
  normalizeFilter,
  POS_GROUPS,
  SPRINT_MINUTES,
  usedKana,
  wordMatches,
  type Filter,
  type FilterCards,
  type FilterDirection,
  type SessionLength,
} from '@/domain/filters';
import { KANA_ROWS, type KanaRow } from '@/domain/kana';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Chips, Group, PillButton, Pills, Row, Section, SwitchRow } from '@/ui/Blocks';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';

const t = strings.filters;

const DIRECTIONS: { value: FilterDirection; label: string }[] = [
  { value: 'recognition', label: t.jpToEn },
  { value: 'production', label: t.enToJp },
  { value: 'random', label: t.random },
];
const CARDS: { value: FilterCards; label: string }[] = [
  { value: 'due', label: t.cardsDue },
  { value: 'new', label: t.cardsNew },
  { value: 'learning', label: t.cardsLearning },
  { value: 'all', label: t.cardsAll },
];
const LENGTHS: { value: SessionLength; label: string }[] = [
  { value: 'all', label: t.lengthAll },
  { value: 10, label: t.lengthCards(10) },
  { value: 20, label: t.lengthCards(20) },
  { value: 50, label: t.lengthCards(50) },
  { value: 'sprint', label: t.sprint(SPRINT_MINUTES) },
];
const ROW_OPTIONS = (Object.keys(KANA_ROWS) as KanaRow[]).map((row) => ({ value: row, label: t.row(KANA_ROWS[row]), jp: true }));
const FIRST_KANA = usedKana(words, 'first').map((k) => ({ value: k, label: k, jp: true }));
const LAST_KANA = usedKana(words, 'last').map((k) => ({ value: k, label: k, jp: true }));
const COMMON_ENDINGS = ['い', 'う', 'る', 'く', 'す', 'つ', 'む', 'ん'];

const nameOf = (id: string) => themeName.get(id) ?? id;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function confirm(title: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) onYes();
    return;
  }
  Alert.alert(title, undefined, [
    { text: t.cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onYes },
  ]);
}

/** A readable default name for a new preset ("Colors · EN → JP"). */
function suggestName(f: Filter): string {
  const parts: string[] = [];
  if (f.themes.length) parts.push(f.themes.map(nameOf).join(', '));
  if (f.pos.length) parts.push(f.pos.map((p) => t.posLabels[p]).join(', '));
  if (f.startsWith.length) parts.push(`${f.startsWith.map((v) => (v in KANA_ROWS ? t.row(KANA_ROWS[v as KanaRow]) : v)).join(' ')}…`);
  if (f.endsWith.length) parts.push(`…${f.endsWith.join(' ')}`);
  if (f.weakOnly) parts.push(t.weak.replace(' only', ''));
  if (f.direction !== 'recognition') parts.push(f.direction === 'production' ? t.enToJp : t.random);
  return parts.join(' · ') || t.cardsDue;
}

/**
 * "Themes & filters": the Claude Design filter screen in TypeKana's style. Choices are saved as
 * they change (setting `customFilter`), so the theme picker and the review screen read them too.
 */
export function FiltersScreen() {
  'use no memo'; // reads the database (presets, live count): see DataProvider
  const { colors } = useTheme();
  const { db, config, now, notifyChanged } = useData();
  const settings = useSettings();
  const update = useUpdateSetting();
  const filter = normalizeFilter(settings.customFilter);
  const set = (patch: Partial<Filter>) => update('customFilter', { ...filter, ...patch });

  const presets = listPresets(db);
  const [naming, setNaming] = useState<string | null>(null);
  const [kanaMode, setKanaMode] = useState<'rows' | 'kana'>(() =>
    filter.startsWith.some((v) => !(v in KANA_ROWS)) ? 'kana' : 'rows',
  );
  const [allEndings, setAllEndings] = useState(() => filter.endsWith.some((k) => !COMMON_ENDINGS.includes(k)));

  const session = customSessionQueue(db, config, now, filter);
  const count = session.learning.length + session.review.length + session.fresh.length + session.practice.length;
  const themeWords = filter.themes.length ? words.filter((w) => wordMatches(w, { ...DEFAULT_FILTER, themes: filter.themes })).length : 0;

  const savePresetNamed = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    savePreset(db, { id: Crypto.randomUUID(), name: trimmed, filter }, Date.now());
    setNaming(null);
    notifyChanged();
  };
  const removePreset = (p: Preset) =>
    confirm(t.deleteTitle(p.name), t.deleteConfirm, () => {
      deletePreset(db, p.id, Date.now());
      notifyChanged();
    });

  const start = () =>
    router.push(filter.length === 'sprint' ? `/review?custom=1&minutes=${SPRINT_MINUTES}` : '/review?custom=1');

  const startsWithOptions = kanaMode === 'rows' ? ROW_OPTIONS : FIRST_KANA;
  const endingOptions = allEndings ? LAST_KANA : LAST_KANA.filter((o) => COMMON_ENDINGS.includes(o.value));

  return (
    <Screen
      title={t.title}
      titleJa={t.titleJa}
      headerRight={
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => update('customFilter', DEFAULT_FILTER)} style={styles.headerAction}>
          <AppText style={[styles.headerActionText, { color: colors.accent }]}>{t.reset}</AppText>
        </Pressable>
      }
      footer={
        <View style={styles.footer}>
          {count ? (
            <AppText variant="caption" muted style={styles.center}>
              {t.breakdown(session.review.length + session.learning.length, session.fresh.length, session.practice.length)}
            </AppText>
          ) : (
            <AppText variant="caption" muted style={styles.center}>
              {t.noneHint(filter.direction === 'production')}
            </AppText>
          )}
          <Button
            label={count ? (filter.length === 'sprint' ? t.startSprint(SPRINT_MINUTES, count) : t.start(count)) : t.none}
            onPress={start}
            disabled={!count}
          />
        </View>
      }>
      <Group title={t.presets}>
        <Pills
          options={presets.map((p) => ({ value: p.id, label: p.name }))}
          selected={presets.filter((p) => filtersEqual(p.filter, filter)).map((p) => p.id)}
          onToggle={(id) => {
            const p = presets.find((x) => x.id === id);
            if (p) update('customFilter', p.filter);
          }}
          onLongPress={(id) => {
            const p = presets.find((x) => x.id === id);
            if (p) removePreset(p);
          }}
          extra={naming === null ? <PillButton label={t.saveCurrent} onPress={() => setNaming(suggestName(filter))} /> : null}
        />
        {naming !== null ? (
          <View style={styles.naming}>
            <TextInput
              autoFocus
              value={naming}
              onChangeText={setNaming}
              onSubmitEditing={() => savePresetNamed(naming)}
              placeholder={t.presetName}
              placeholderTextColor={colors.textFaint}
              selectTextOnFocus
              maxLength={40}
              returnKeyType="done"
              accessibilityLabel={t.presetName}
              style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.borderStrong }]}
            />
            <Pressable accessibilityRole="button" onPress={() => savePresetNamed(naming)} style={[styles.inlineButton, { backgroundColor: colors.text }]}>
              <AppText style={[styles.inlineButtonText, { color: colors.background }]}>{t.save}</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setNaming(null)} style={styles.inlineCancel}>
              <AppText muted style={styles.inlineButtonText}>{t.cancel}</AppText>
            </Pressable>
          </View>
        ) : null}
        {!presets.length && naming === null ? <AppText variant="caption" faint>{t.presetsHint}</AppText> : null}
      </Group>

      <Group title={t.direction}>
        <Chips options={DIRECTIONS} value={filter.direction} onChange={(direction) => set({ direction })} />
      </Group>

      <Group title={t.theme}>
        <Section>
          <Row
            glyph="題"
            label={filter.themes.length ? t.themesLine(filter.themes.map(nameOf), themeWords) : t.allThemes}
            onPress={() => router.push('/themes')}
          />
        </Section>
      </Group>

      <Group title={t.pos}>
        <Pills
          options={[{ value: 'any', label: t.any }, ...POS_GROUPS.map((p) => ({ value: p, label: t.posLabels[p] }))]}
          selected={filter.pos.length ? filter.pos : ['any']}
          onToggle={(v) => set({ pos: v === 'any' ? [] : toggle(filter.pos, v as Filter['pos'][number]) })}
        />
      </Group>

      <Group
        title={t.startsWith}
        aside={
          <View style={styles.modeSwitch}>
            {(['rows', 'kana'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ selected: kanaMode === m }}
                hitSlop={6}
                onPress={() => {
                  if (m === kanaMode) return;
                  setKanaMode(m);
                  set({ startsWith: [] });
                }}>
                <AppText variant="caption" style={{ color: kanaMode === m ? colors.text : colors.accent, fontWeight: '700' }}>
                  {m === 'rows' ? t.rows : t.singleKana}
                </AppText>
              </Pressable>
            ))}
          </View>
        }>
        <Pills
          options={startsWithOptions}
          columns={kanaMode === 'rows' ? 5 : undefined}
          selected={filter.startsWith}
          onToggle={(v) => set({ startsWith: toggle(filter.startsWith, v) })}
        />
        {kanaMode === 'rows' ? <AppText variant="caption" faint>{t.rowsHint}</AppText> : null}
      </Group>

      <Group title={t.endsWith}>
        <Pills
          options={endingOptions}
          selected={filter.endsWith}
          onToggle={(v) => set({ endsWith: toggle(filter.endsWith, v) })}
          extra={<PillButton label={allEndings ? t.less : t.more} onPress={() => setAllEndings(!allEndings)} />}
        />
      </Group>

      <Group title={t.cards}>
        <Pills
          radio
          options={CARDS}
          selected={[filter.cards]}
          onToggle={(v) => set({ cards: v as FilterCards })}
        />
        <AppText variant="caption" faint>{t.cardsHint[filter.cards]}</AppText>
        <Section>
          <SwitchRow label={t.weak} sub={t.weakSub} value={filter.weakOnly} onChange={(weakOnly) => set({ weakOnly })} />
        </Section>
      </Group>

      <Group title={t.length}>
        <Pills
          radio
          options={LENGTHS.map((l) => ({ value: String(l.value), label: l.label }))}
          selected={[String(filter.length)]}
          onToggle={(v) => set({ length: (/^\d+$/.test(v) ? Number(v) : v) as SessionLength })}
        />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerAction: { paddingHorizontal: 4, paddingVertical: 6 },
  headerActionText: { fontSize: 15, fontWeight: '700' },
  footer: { gap: 8 },
  center: { textAlign: 'center' },
  naming: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, fontSize: 15 },
  inlineButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  inlineCancel: { minHeight: 44, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  inlineButtonText: { fontSize: 14.5, fontWeight: '700' },
  modeSwitch: { flexDirection: 'row', gap: 12 },
});
