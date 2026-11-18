import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { maxContentWidth } from '@/theme/tokens';

import { BackHeader } from './BackHeader';

type Props = {
  children: ReactNode;
  /** Shows TypeKana's back header. */
  title?: string;
  titleJa?: string;
  back?: boolean;
  scroll?: boolean;
  /** Pinned under the scroll area (e.g. a primary button). */
  footer?: ReactNode;
  /** Action on the right of the header. */
  headerRight?: ReactNode;
};

/** Page wrapper: paper background, 24 px gutters, centred column with a max width on desktop. */
export function Screen({ children, title, titleJa, back = true, scroll = true, footer, headerRight }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const header = back || title ? <BackHeader title={title} titleJa={titleJa} right={headerRight} /> : <View style={{ height: insets.top + 12 }} />;
  // A screen that doesn't scroll (the word list) still keeps clear of the home indicator / Android nav bar.
  const body = <View style={[styles.body, !scroll && !footer && { paddingBottom: insets.bottom + 12 }]}>{children}</View>;
  return (
    // Side insets: landscape with a notch or camera cut-out, Android edge-to-edge.
    <View style={[styles.root, { backgroundColor: colors.background, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.column}>
        {header}
        {scroll ? (
          <ScrollView style={styles.flex} contentContainerStyle={[styles.scroll, !footer && { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', paddingHorizontal: 24 },
  scroll: { flexGrow: 1 },
  body: { flex: 1, gap: 22 },
  footer: { paddingTop: 10 },
});
