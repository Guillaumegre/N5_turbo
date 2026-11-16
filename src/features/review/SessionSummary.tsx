import { StyleSheet, View } from 'react-native';

import { wordById } from '@/data/vocab';
import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';

import type { SessionStats } from './session';
import type { EndReason } from './useReviewSession';

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}

/** `onMore` is absent in custom sessions (no daily goal there). */
type Props = { stats: SessionStats; reason: EndReason; onMore?: () => void; onResume: () => void; onDone: () => void };

export function SessionSummary({ stats, reason, onMore, onResume, onDone }: Props) {
  const { colors } = useTheme();
  const title = reason === 'done' ? (onMore ? strings.summary.goalDone : strings.summary.sessionDone) : reason === 'time' ? strings.summary.timeUp : strings.summary.ended;
  const perCard = stats.answers ? `${(stats.timeMs / stats.answers / 1000).toFixed(1)}s` : '–';
  const bars = [
    { n: stats.byRating[1], color: colors.again, label: strings.review.again },
    { n: stats.byRating[2], color: colors.hard, label: strings.review.hard },
    { n: stats.byRating[3], color: colors.good, label: strings.review.good },
    { n: stats.byRating[4], color: colors.easy, label: strings.review.easy },
  ];
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={[styles.seal, { borderColor: colors.accent }]}>
          <AppText variant="jpWord" style={{ fontSize: 38, lineHeight: 48, color: colors.accent }}>済</AppText>
        </View>
        <AppText variant="title">{title}</AppText>
        <AppText muted>{formatDuration(stats.timeMs)}</AppText>
      </View>

      <View style={[styles.tiles, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Tile value={String(stats.cards)} label={strings.summary.cards} />
        <Tile value={`${stats.correctPercent}%`} label={strings.summary.correct} color={colors.good} />
        <Tile value={perCard} label={strings.summary.perCard} />
      </View>

      {stats.answers ? (
        <View style={styles.section}>
          <AppText variant="caption" muted>{strings.summary.answers}</AppText>
          <View style={styles.bar}>
            {bars.filter((b) => b.n).map((b) => (
              <View key={b.label} style={{ flex: b.n, backgroundColor: b.color }} />
            ))}
          </View>
          <View style={styles.legend}>
            {bars.map((b) => (
              <AppText key={b.label} variant="caption">
                <AppText variant="caption" style={{ color: b.color, fontWeight: '700' }}>{b.n}</AppText> {b.label}
              </AppText>
            ))}
          </View>
        </View>
      ) : null}

      {stats.toRevisit.length ? (
        <View style={styles.section}>
          <AppText variant="caption" muted>{strings.summary.toRevisit}</AppText>
          <View style={styles.chips}>
            {stats.toRevisit.map((id) => (
              <View key={id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <AppText style={{ fontSize: 16 }}>{wordById.get(id)?.kanji}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.spacer} />
      <View style={styles.actions}>
        {reason !== 'done' ? (
          <Button label={strings.summary.resume} onPress={onResume} />
        ) : onMore ? (
          <Button label={strings.summary.keepGoing} onPress={onMore} />
        ) : null}
        <Button label={strings.summary.done} variant="secondary" onPress={onDone} />
      </View>
    </View>
  );
}

function Tile({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <AppText style={[styles.tileValue, color ? { color } : null]}>{value}</AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: spacing.xl, paddingTop: spacing.xl },
  head: { alignItems: 'center', gap: spacing.sm },
  seal: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tiles: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.lg, paddingVertical: spacing.md },
  tile: { flex: 1, alignItems: 'center', gap: 2 },
  tileValue: { fontSize: 26, fontWeight: '600' },
  section: { gap: spacing.sm },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  spacer: { flex: 1 },
  actions: { gap: spacing.sm },
});
