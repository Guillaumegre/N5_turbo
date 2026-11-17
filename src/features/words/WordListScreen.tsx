import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useData } from '@/data/DataProvider';
import { wordStates } from '@/data/repo/cards';
import { words, type Word } from '@/data/vocab';
import { toHiragana } from '@/domain/kana';
import type { WordState } from '@/domain/progress';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Icon } from '@/ui/Icon';
import { Screen } from '@/ui/Screen';

const t = strings.words;
type StateFilter = 'all' | WordState;
const STATES: WordState[] = ['new', 'learning', 'mastered'];

/** Matches the written form, the reading (katakana or hiragana typed) or the English meaning. */
function matches(w: Word, q: string): boolean {
  if (!q) return true;
  const kana = toHiragana(q);
  return w.kanji.includes(q) || toHiragana(w.reading).includes(kana) || w.meaning_en.toLowerCase().includes(q.toLowerCase());
}

/** Every N5 word in gojūon order, with a search box and a state filter. Tapping a word opens it. */
export function WordListScreen() {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { db, revision } = useData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StateFilter>('all');
  const [focused, setFocused] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `revision` changes after every write
  const states = useMemo(() => wordStates(db), [db, revision]);
  const stateOf = (w: Word) => states.get(w.id) ?? 'new';

  const searched = useMemo(() => words.filter((w) => matches(w, query.trim())), [query]);
  const shown = filter === 'all' ? searched : searched.filter((w) => stateOf(w) === filter);
  const count = (s: StateFilter) => (s === 'all' ? searched.length : searched.filter((w) => stateOf(w) === s).length);
  const dot: Record<WordState, string> = { new: colors.borderStrong, learning: colors.accent, mastered: colors.good };

  return (
    <Screen title={t.title} titleJa={t.titleJa} scroll={false}>
      {/* Focus shows on the box border (the browser's own focus ring is turned off below). */}
      <View style={[styles.search, { backgroundColor: colors.surface, borderColor: focused ? colors.text : colors.border }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t.search}
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          accessibilityLabel={t.search}
          style={[styles.input, { color: colors.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        />
      </View>
      {/* Segmented control: label over count, so four options fit a phone's width. */}
      <View style={[styles.segments, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="radiogroup">
        {(['all', ...STATES] as StateFilter[]).map((s) => {
          const active = filter === s;
          const label = s === 'all' ? t.all : t.states[s];
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}, ${t.count(count(s))}`}
              onPress={() => setFilter(s)}
              style={[styles.segment, active && { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AppText style={[styles.segLabel, { color: active ? colors.text : colors.textMuted }]}>{label}</AppText>
              <AppText variant="caption" muted style={styles.segCount}>{count(s)}</AppText>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        style={styles.list}
        data={shown}
        keyExtractor={(w) => w.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={<AppText muted style={styles.empty}>{t.empty}</AppText>}
        renderItem={({ item: w }) => {
          const s = stateOf(w);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${w.kanji}, ${w.reading}, ${w.meaning_en}, ${t.states[s]}`}
              onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.id } })}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.jp}>
                <AppText style={styles.kanji} numberOfLines={1}>{w.kanji}</AppText>
                {w.kanji !== w.reading ? <AppText variant="caption" muted numberOfLines={1}>{w.reading}</AppText> : null}
              </View>
              <AppText style={styles.meaning} numberOfLines={2}>{w.meaning_en}</AppText>
              <View style={[styles.dot, { backgroundColor: dot[s] }]} />
              <Icon name="chevronRight" size={14} color={colors.textFaint} />
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { minHeight: 46, fontSize: 16 },
  segments: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 3, marginTop: -8 },
  segment: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  segLabel: { fontSize: 13.5, fontWeight: '500' },
  segCount: { fontVariant: ['tabular-nums'] },
  list: { flex: 1, marginTop: -8 },
  sep: { height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  pressed: { opacity: 0.6 },
  jp: { width: 112 },
  kanji: { fontFamily: fonts.jp, fontSize: 20, fontWeight: '300' },
  meaning: { flex: 1, fontSize: 14.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 32 },
});
