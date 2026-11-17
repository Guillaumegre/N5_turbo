/**
 * Japanese text with furigana (native: iOS / Android).
 * React Native has no ruby layout, so each kanji group is a small column (reading above,
 * base below) and plain kana are split per character so lines can wrap anywhere, as Japanese does.
 * Furigana.web.tsx uses real <ruby> markup instead.
 */
import { StyleSheet, Text, View } from 'react-native';

import type { FuriganaSegment } from '@/data/vocab';
import { fonts } from '@/theme/tokens';

import { plainText, type FuriganaProps } from './furiganaTypes';

export function Furigana({ segments, size, showReading, color, readingColor, align = 'left', weight = '400' }: FuriganaProps) {
  const units = segments.flatMap((s) => (s.r ? [s] : [...s.t].map((t) => ({ t }) as FuriganaSegment)));
  const rubySize = Math.round(size * 0.5);
  return (
    <View
      accessible
      accessibilityLabel={plainText(segments)}
      style={[styles.row, align === 'center' && styles.center]}>
      {units.map((u, i) => (
        <View key={i} style={styles.unit}>
          {/* Always laid out, only hidden: toggling furigana must not move the text. */}
          {u.r ? (
            <Text
              style={{ fontFamily: fonts.jp, fontSize: rubySize, lineHeight: rubySize * 1.25, color: readingColor, opacity: showReading ? 1 : 0 }}>
              {u.r}
            </Text>
          ) : null}
          <Text style={{ fontFamily: fonts.jp, fontSize: size, lineHeight: size * 1.4, color, fontWeight: weight }}>{u.t}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  center: { justifyContent: 'center' },
  unit: { alignItems: 'center' },
});
