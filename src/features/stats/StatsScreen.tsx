import { StyleSheet, View } from 'react-native';

import { useData } from '@/data/DataProvider';
import { allCards, reviewLog, streak, wordStates } from '@/data/repo/cards';
import { words } from '@/data/vocab';
import { POS_GROUPS } from '@/domain/filters';
import { tallyWords } from '@/domain/progress';
import { addStudyDays } from '@/domain/srs/time';
import { answeredToday, answersPerDay, dueForecast, minutesStudied, retention } from '@/domain/stats';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { BarChart } from '@/ui/BarChart';
import { Section } from '@/ui/Blocks';
import { formatShortDate } from '@/ui/dates';
import { Screen } from '@/ui/Screen';
import { StackedBar } from '@/ui/StackedBar';

const t = strings.stats;
const h = strings.home;

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="caption" muted style={styles.tileLabel}>{label}</AppText>
      <AppText style={styles.tileValue}>
        {value}
        {unit ? <AppText muted style={styles.tileUnit}>{` ${unit}`}</AppText> : null}
      </AppText>
      {sub ? <AppText variant="caption" muted>{sub}</AppText> : null}
    </View>
  );
}

/** Today, streak, retention and time; answers over 30 days; the coming week; words by state and type. */
export function StatsScreen() {
  'use no memo'; // reads the database: see DataProvider
  const { colors } = useTheme();
  const { db, now, config } = useData();
  const H = config.dayStartHour;

  const since = addStudyDays(now, -29, H);
  const log = reviewLog(db, since);
  const perDay = answersPerDay(log, now, H, 30);
  const total = perDay.reduce((a, b) => a + b, 0);
  const rate = retention(log);
  const forecast = dueForecast(allCards(db), now, H, 7);
  const { all, byPos } = tallyWords(words, wordStates(db));
  const days = streak(db, now, H);
  const today = answeredToday(log, now, H);

  const dayDate = (offset: number) => formatShortDate(addStudyDays(now, offset, H));
  const weekday = (offset: number) =>
    offset === 0 ? t.todayShort : new Date(addStudyDays(now, offset, H)).toLocaleDateString('en-GB', { weekday: 'short' });

  return (
    <Screen title={t.title} titleJa={t.titleJa}>
      <View style={styles.tiles}>
        <Tile label={t.today} value={String(today)} unit={t.answers(today)} />
        <Tile label={t.streak} value={String(days)} unit={t.days(days)} />
        <Tile
          label={t.retention}
          value={rate === null ? '—' : `${Math.round(rate * 100)}%`}
          sub={rate === null ? t.noRetention : t.retentionSub}
        />
        <Tile label={t.time} value={String(minutesStudied(log))} unit={t.minutes} sub={t.timeSub} />
      </View>

      <Section title={t.last30}>
        <BarChart
          values={perDay}
          highlight={29}
          labels={[dayDate(-29), t.todayShort]}
          summary={t.last30Line(total, Math.round((total / 30) * 10) / 10)}
          describe={(i) => t.barAnswers(perDay[i], dayDate(i - 29))}
        />
      </Section>

      <Section title={t.comingUp}>
        <BarChart
          values={forecast}
          highlight={0}
          labels={forecast.map((_, i) => weekday(i))}
          summary={t.comingUpLine(forecast.reduce((a, b) => a + b, 0))}
          describe={(i) => t.barDue(forecast[i], i === 0 ? t.todayShort : dayDate(i))}
          height={72}
        />
      </Section>

      <Section title={t.words}>
        <View style={styles.words}>
          <AppText style={styles.wordsLine}>
            {all.learning + all.mastered}
            <AppText muted style={styles.wordsOf}>{` / ${all.total} ${h.wordsStarted}`}</AppText>
          </AppText>
          <StackedBar tally={all} height={8} />
          <View style={styles.legend}>
            {[
              { n: all.mastered, label: h.mastered, color: colors.good },
              { n: all.learning, label: h.learning, color: colors.accent },
              { n: all.new, label: h.toLearn, color: colors.borderStrong },
            ].map((s) => (
              <View key={s.label} style={styles.legendItem}>
                <View style={styles.legendHead}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <AppText variant="caption" muted>{s.label}</AppText>
                </View>
                <AppText style={styles.legendValue}>{s.n}</AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption" muted>{h.masteredLegend}</AppText>

          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <AppText variant="label" faint>{h.byType}</AppText>
          {POS_GROUPS.map((g) => {
            const tally = byPos.get(g);
            if (!tally) return null;
            return (
              <View key={g} style={styles.type}>
                <AppText style={styles.typeLabel}>{h.posPlural[g]}</AppText>
                <View style={styles.flex}>
                  <StackedBar tally={tally} />
                </View>
                <AppText muted style={styles.typeCount}>
                  {tally.learning + tally.mastered}/{tally.total}
                </AppText>
              </View>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 4 },
  tileLabel: { fontSize: 12.5 },
  tileValue: { fontSize: 26, fontWeight: '300', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  tileUnit: { fontSize: 14, fontWeight: '400', letterSpacing: 0 },
  words: { gap: 12 },
  wordsLine: { fontSize: 26, fontWeight: '300', letterSpacing: -0.6 },
  wordsOf: { fontSize: 14, fontWeight: '400', letterSpacing: 0 },
  legend: { flexDirection: 'row' },
  legendItem: { flex: 1, gap: 2 },
  legendHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendValue: { fontSize: 18, fontVariant: ['tabular-nums'] },
  rule: { height: 1, marginHorizontal: -16, marginVertical: 4 },
  type: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeLabel: { width: 104, fontSize: 14 },
  typeCount: { width: 60, textAlign: 'right', fontSize: 13, fontVariant: ['tabular-nums'] },
});
