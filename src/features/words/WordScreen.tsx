import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useData, useSettings } from '@/data/DataProvider';
import { answerCount, cardId, DIRECTIONS, getCard } from '@/data/repo/cards';
import { wordById } from '@/data/vocab';
import { formatInterval } from '@/domain/srs/format';
import { DAY } from '@/domain/srs/types';
import { CardBack } from '@/features/review/CardContent';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText } from '@/ui/AppText';
import { Divider, Section } from '@/ui/Blocks';
import { Screen } from '@/ui/Screen';

const t = strings.words;

/** One word: the answer side of its card, then where each of its two cards stands. */
export function WordScreen() {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { db, now } = useData();
  const { furigana } = useSettings();
  const { id } = useLocalSearchParams<{ id: string }>();
  const word = wordById.get(id ?? '');
  if (!word) return <Screen title={t.title}><AppText muted>{t.empty}</AppText></Screen>;

  const status = (direction: (typeof DIRECTIONS)[number]) => {
    const card = getCard(db, cardId(word.id, direction));
    if (!card || card.status === 'new') return { line: t.cardNew, answers: '' };
    const next = card.due <= now ? t.nowDue : t.inTime(formatInterval(card.due - now));
    return {
      line: card.status === 'review' ? t.cardReview(next, formatInterval(card.interval * DAY)) : t.cardLearning(next),
      answers: t.answers(answerCount(db, card.id), card.lapses),
    };
  };

  return (
    <Screen title={word.kanji}>
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <CardBack word={word} furigana={furigana} />
      </View>
      <Section title={t.progress}>
        {DIRECTIONS.map((d, i) => {
          const s = status(d);
          return (
            <View key={d}>
              {i ? <Divider /> : null}
              <View style={styles.dir}>
                <AppText style={styles.dirTitle}>{t.directions[d]}</AppText>
                <AppText muted style={styles.dirLine}>{s.line}</AppText>
                {s.answers ? <AppText variant="caption" muted>{s.answers}</AppText> : null}
              </View>
            </View>
          );
        })}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheet: { borderWidth: 1, borderRadius: 28, overflow: 'hidden' },
  dir: { gap: 3 },
  dirTitle: { fontSize: 15, fontWeight: '500' },
  dirLine: { fontSize: 14 },
});
