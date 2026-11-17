/**
 * TypeKana building blocks: big cards with a kanji watermark, settings sections,
 * rows with a glyph box, chips, switches and the thin progress track.
 */
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon } from './Icon';

export function BigCard({
  eyebrow,
  title,
  sub,
  watermark,
  tone = 'ink',
  compact = false,
  onPress,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  watermark: string;
  tone?: 'ink' | 'accent';
  /** Smaller card for secondary actions. */
  compact?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const ink = tone === 'ink';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigCard,
        compact && styles.compactCard,
        { backgroundColor: ink ? colors.inkCard : colors.accent },
        pressed && styles.pressedCard,
      ]}>
      <AppText style={[styles.watermark, compact && styles.compactWatermark, { color: ink ? colors.watermark : colors.watermarkWarm }]} accessible={false}>
        {watermark}
      </AppText>
      <AppText style={[styles.cardEyebrow, { color: ink ? colors.onInkSoft : 'rgba(255,255,255,.66)' }]}>{eyebrow}</AppText>
      <AppText style={[styles.cardTitle, compact && styles.compactTitle, { color: ink ? colors.onInk : '#FBF9F5' }]}>{title}</AppText>
      {sub ? <AppText style={[styles.cardSub, { color: ink ? colors.onInkSoft : 'rgba(255,255,255,.78)' }]}>{sub}</AppText> : null}
    </Pressable>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View>
      {title ? (
        <AppText variant="label" faint style={styles.sectionTitle}>
          {title}
        </AppText>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

/** A row with a kanji in a soft box, a label, a sub-line and a chevron (or a trailing element). */
export function Row({
  glyph,
  label,
  sub,
  onPress,
  trailing,
}: {
  glyph?: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      {glyph ? (
        <View style={[styles.glyphBox, { backgroundColor: colors.surfaceMuted }]}>
          <AppText style={[styles.glyph, { color: colors.text }]}>{glyph}</AppText>
        </View>
      ) : null}
      <View style={styles.rowText}>
        <AppText style={styles.rowLabel}>{label}</AppText>
        {sub ? <AppText variant="caption" faint style={styles.rowSub}>{sub}</AppText> : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevronRight" size={16} color={colors.textFaint} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressedRow]}>
      {content}
    </Pressable>
  );
}

export function SwitchRow({ glyph, label, sub, value, onChange }: { glyph?: string; label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Row
      glyph={glyph}
      label={label}
      sub={sub}
      trailing={
        <Switch
          accessibilityLabel={label}
          value={value}
          onValueChange={onChange}
          trackColor={{ false: colors.borderStrong, true: colors.accent }}
          thumbColor="#FBF9F5"
          // react-native-web colours the "on" knob with its own prop (teal by default).
          {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FBF9F5' } as object) : {})}
        />
      }
    />
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.chips} accessibilityRole="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: active ? colors.text : colors.background, borderColor: active ? colors.text : colors.borderStrong },
              pressed && styles.pressed,
            ]}>
            <AppText style={[styles.chipText, { color: active ? colors.background : colors.textMuted }]}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A titled group without a card around it (filter screen). `aside` sits right of the title. */
export function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <AppText variant="label" faint>{title}</AppText>
        {aside}
      </View>
      {children}
    </View>
  );
}

export type PillOption = { value: string; label: string; jp?: boolean };

/**
 * Wrapping pill chips. Multi-select by default (`selected` = every active value).
 * `columns` lays them out as an even grid instead (kana rows).
 */
export function Pills({
  options,
  selected,
  onToggle,
  onLongPress,
  columns,
  radio = false,
  extra,
}: {
  options: PillOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onLongPress?: (value: string) => void;
  columns?: number;
  radio?: boolean;
  extra?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.pills} accessibilityRole={radio ? 'radiogroup' : undefined}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <Pressable
            key={o.value}
            accessibilityRole={radio ? 'radio' : 'checkbox'}
            accessibilityState={radio ? { selected: active } : { checked: active }}
            accessibilityLabel={o.label}
            onPress={() => onToggle(o.value)}
            onLongPress={onLongPress ? () => onLongPress(o.value) : undefined}
            style={({ pressed }) => [
              styles.pill,
              columns ? { width: `${100 / columns - 2}%` as const, paddingHorizontal: 0 } : null,
              { backgroundColor: active ? colors.text : colors.surface, borderColor: active ? colors.text : colors.borderStrong },
              pressed && styles.pressed,
            ]}>
            <AppText
              style={[
                o.jp ? styles.pillJp : styles.pillText,
                { color: active ? colors.background : colors.text },
              ]}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
      {extra}
    </View>
  );
}

/** Dashed accent pill ("+ Save current", "More…"). */
export function PillButton({ label, onPress, onLongPress }: { label: string; onPress: () => void; onLongPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.pill, styles.dashed, { borderColor: colors.accent }, pressed && styles.pressed]}>
      <AppText style={[styles.pillText, { color: colors.accent }]}>{label}</AppText>
    </Pressable>
  );
}

export function Track({ value, height = 4 }: { value: number; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.track, { height, backgroundColor: colors.border }]}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, borderRadius: height / 2, backgroundColor: colors.accent }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bigCard: { position: 'relative', overflow: 'hidden', borderRadius: radius.xl, paddingVertical: 22, paddingHorizontal: 24 },
  pressedCard: { opacity: 0.92, transform: [{ scale: 0.995 }] },
  watermark: { position: 'absolute', right: 4, bottom: -48, fontFamily: fonts.mincho, fontSize: 132, lineHeight: 140 },
  compactCard: { paddingVertical: 16, paddingHorizontal: 20 },
  compactWatermark: { fontSize: 96, lineHeight: 104, bottom: -34 },
  compactTitle: { fontSize: 21, letterSpacing: -0.6, marginTop: 4 },
  cardEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  cardTitle: { fontSize: 29, fontWeight: '600', letterSpacing: -1, marginTop: 6 },
  cardSub: { fontSize: 13.5, fontWeight: '500', marginTop: 3 },
  sectionTitle: { marginBottom: 8, marginLeft: 2 },
  card: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16 },
  divider: { height: 1, marginVertical: 14, marginHorizontal: -16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pressedRow: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  glyphBox: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontFamily: fonts.mincho, fontSize: 19 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15.5, fontWeight: '600', letterSpacing: -0.3 },
  rowSub: { marginTop: 3 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: radius.sm, borderWidth: 1 },
  chipText: { fontSize: 14.5, fontWeight: '500' },
  track: { borderRadius: 2, overflow: 'hidden' },
  group: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginLeft: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  pillText: { fontSize: 14, fontWeight: '500' },
  pillJp: { fontFamily: fonts.jp, fontSize: 16 },
});
