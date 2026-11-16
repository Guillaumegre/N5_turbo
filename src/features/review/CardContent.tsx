import { StyleSheet, View } from 'react-native';

import { readingOf, themeName, type Word } from '@/data/vocab';
import type { Direction } from '@/domain/srs/types';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Furigana } from '@/ui/Furigana';
import { IconButton } from '@/ui/IconButton';

import { speakJapanese } from './speak';

function posLabel(word: Word): string {
  return strings.pos[word.pos] ?? word.pos;
}

/** Front: the word in kanji only (JP → EN) or the English meaning (EN → JP). */
export function CardFront({ word, direction, furigana }: { word: Word; direction: Direction; furigana: boolean }) {
  const { colors, fontScale } = useTheme();
  if (direction === 'production') {
    return (
      <View style={styles.front}>
        <AppText variant="caption" muted style={styles.label}>{strings.review.enToJp}</AppText>
        <AppText style={[styles.prompt, { fontSize: 30 * fontScale, color: colors.text }]}>{word.meaning_en}</AppText>
        <AppText variant="caption" muted>{posLabel(word)}</AppText>
      </View>
    );
  }
  return (
    <View style={styles.front}>
      <AppText variant="caption" muted style={styles.label}>{strings.review.jpToEn}</AppText>
      <Furigana
        segments={word.furigana}
        size={76 * fontScale}
        showReading={furigana}
        color={colors.text}
        readingColor={colors.furigana}
        align="center"
      />
      <IconButton icon="speaker" label={strings.review.playWord} bordered onPress={() => speakJapanese(word.reading)} />
    </View>
  );
}

/** Back: the word (with furigana when on), meaning, part of speech and themes, example sentences. */
export function CardBack({ word, furigana }: { word: Word; furigana: boolean }) {
  const { colors, fontScale } = useTheme();
  const meta = [
    furigana ? null : word.reading, // the reading is part of the answer even with furigana off
    posLabel(word),
    word.themes.map((t) => themeName.get(t)).join(', '),
  ].filter(Boolean);
  return (
    <View style={styles.back}>
      <View style={styles.head}>
        <View style={styles.wordRow}>
          <Furigana
            segments={word.furigana}
            size={52 * fontScale}
            showReading={furigana}
            color={colors.text}
            readingColor={colors.furigana}
            align="center"
          />
          <IconButton icon="speaker" size={40} label={strings.review.playWord} bordered onPress={() => speakJapanese(word.reading)} />
        </View>
        <AppText style={[styles.meaning, { color: colors.accent, fontSize: 26 * fontScale }]}>{word.meaning_en}</AppText>
        <AppText variant="caption" muted style={styles.center}>{meta.join(' · ')}</AppText>
      </View>

      {word.examples.length ? <View style={[styles.rule, { backgroundColor: colors.border }]} /> : null}

      <View style={styles.examples}>
        {word.examples.map((ex) => (
          <View key={ex.src[0]} style={styles.example}>
            <View style={styles.exampleText}>
              <Furigana
                segments={ex.ja}
                size={fontSize.sentence * fontScale}
                showReading={furigana}
                color={colors.text}
                readingColor={colors.furigana}
              />
              <AppText muted style={{ fontSize: 15 * fontScale, fontWeight: '400' }}>{ex.en}</AppText>
            </View>
            <IconButton icon="speaker" size={36} label={strings.review.playSentence} bordered onPress={() => speakJapanese(readingOf(ex.ja))} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  front: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.xl },
  label: { letterSpacing: 1, textTransform: 'uppercase' },
  prompt: { fontWeight: '400', textAlign: 'center' },
  center: { textAlign: 'center' },
  back: { gap: spacing.lg, paddingVertical: spacing.lg },
  head: { alignItems: 'center', gap: spacing.xs },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  meaning: { fontWeight: '400', textAlign: 'center' },
  rule: { height: StyleSheet.hairlineWidth * 2 },
  examples: { gap: spacing.lg },
  example: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  exampleText: { flex: 1, gap: 2, minWidth: 0 },
});
