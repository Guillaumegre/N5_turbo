import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { readingOf, themeName, type Example, type Word } from '@/data/vocab';
import type { Direction } from '@/domain/srs/types';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fontSize, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Furigana } from '@/ui/Furigana';
import { plainText } from '@/ui/furiganaTypes';
import { IconButton } from '@/ui/IconButton';

import { speakJapanese } from './speak';

function posLabel(word: Word): string {
  return strings.pos[word.pos] ?? word.pos;
}

/**
 * Front, laid out on the card sheet: direction at the top, the word (kanji only, JP → EN) or the
 * English meaning (EN → JP) in the middle, a hint at the bottom. The whole sheet reveals.
 */
export function CardFront({ word, direction, furigana }: { word: Word; direction: Direction; furigana: boolean }) {
  const { colors, fontScale } = useTheme();
  const production = direction === 'production';
  return (
    <View style={styles.front}>
      <AppText variant="caption" muted style={styles.label}>{production ? strings.review.enToJp : strings.review.jpToEn}</AppText>
      <View style={styles.frontMiddle}>
        {production ? (
          <>
            <AppText style={[styles.prompt, { fontSize: 32 * fontScale, color: colors.text }]}>{word.meaning_en}</AppText>
            <AppText variant="caption" muted>{posLabel(word)}</AppText>
          </>
        ) : (
          <>
            <Furigana
              segments={word.furigana}
              size={80 * fontScale}
              weight="300"
              showReading={furigana}
              color={colors.text}
              readingColor={colors.furigana}
              align="center"
            />
            <IconButton icon="speaker" size={48} label={strings.review.playWord} bordered onPress={() => speakJapanese(word.reading)} />
          </>
        )}
      </View>
      <AppText variant="caption" muted style={styles.hint}>{production ? strings.review.hintProduction : strings.review.hintRecognition}</AppText>
    </View>
  );
}

/** Back: the word (with furigana when on), meaning, part of speech and themes as tags, example sentences. */
export function CardBack({ word, furigana }: { word: Word; furigana: boolean }) {
  const { colors, fontScale } = useTheme();
  const tags = [posLabel(word), ...word.themes.map((t) => themeName.get(t) ?? t)];
  return (
    <View style={styles.back}>
      <View style={styles.head}>
        <View style={styles.wordRow}>
          {/* Same width as the speaker button on the other side, so the word sits in the centre. */}
          <View style={styles.balance} />
          {/* The reading is part of the answer: always shown over the word, whatever the furigana toggle. */}
          <Furigana
            segments={word.furigana}
            size={52 * fontScale}
            weight="300"
            showReading
            color={colors.text}
            readingColor={colors.furigana}
            align="center"
          />
          <IconButton icon="speaker" size={40} label={strings.review.playWord} bordered onPress={() => speakJapanese(word.reading)} />
        </View>
        <AppText style={[styles.meaning, { color: colors.accent, fontSize: 30 * fontScale }]}>{word.meaning_en}</AppText>
        <View style={styles.tags}>
          {tags.map((t) => (
            <View key={t} style={[styles.tag, { backgroundColor: colors.surfaceMuted }]}>
              <AppText variant="caption" muted>{t}</AppText>
            </View>
          ))}
        </View>
      </View>

      {word.examples.length ? (
        <View style={styles.divider}>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <AppText variant="caption" muted style={styles.label}>{strings.review.examples}</AppText>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
        </View>
      ) : null}

      <View style={styles.examples}>
        {word.examples.map((ex) => (
          <ExampleRow key={ex.src[0]} example={ex} furigana={furigana} />
        ))}
      </View>
    </View>
  );
}

/** One example sentence with its translation, a play button and a copy button (to paste it elsewhere). */
function ExampleRow({ example, furigana }: { example: Example; furigana: boolean }) {
  const { colors, fontScale } = useTheme();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = () => {
    Clipboard.setStringAsync(`${plainText(example.ja)}\n${example.en}`)
      .then(() => setCopied(true))
      .catch(() => {});
  };
  const text = (
    <>
      <Furigana
        segments={example.ja}
        size={(fontSize.sentence - 1) * fontScale}
        weight="300"
        showReading={furigana}
        color={colors.text}
        readingColor={colors.furigana}
      />
      <AppText muted style={{ fontSize: 14.5 * fontScale }}>{example.en}</AppText>
      {copied ? <AppText variant="caption" style={{ color: colors.good }}>{strings.review.copied}</AppText> : null}
    </>
  );
  return (
    <View style={styles.example}>
      {/* Web: real text, selectable like any page. Phones: the furigana layout is drawn in pieces
          and can't be selected, so holding the sentence copies it with its translation. */}
      {Platform.OS === 'web' ? (
        <View style={styles.exampleText}>{text}</View>
      ) : (
        <Pressable
          onLongPress={copy}
          delayLongPress={350}
          accessibilityHint={strings.review.holdToCopy}
          style={({ pressed }) => [styles.exampleText, pressed && { opacity: 0.6 }]}>
          {text}
        </Pressable>
      )}
      <IconButton icon="speaker" size={36} label={strings.review.playSentence} bordered onPress={() => speakJapanese(readingOf(example.ja))} />
    </View>
  );
}

const styles = StyleSheet.create({
  front: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 22, paddingHorizontal: spacing.md },
  frontMiddle: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  label: { letterSpacing: 1.6, textTransform: 'uppercase', fontSize: 11 },
  hint: { textAlign: 'center' },
  prompt: { fontWeight: '300', textAlign: 'center', letterSpacing: -0.3 },
  back: { gap: 20, paddingVertical: 24, paddingHorizontal: 20 },
  head: { alignItems: 'center', gap: 6 },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  balance: { width: 40 },
  meaning: { fontWeight: '300', textAlign: 'center', letterSpacing: -0.3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { flex: 1, height: 1 },
  examples: { gap: 16 },
  example: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  exampleText: { flex: 1, gap: 2, minWidth: 0 },
});
