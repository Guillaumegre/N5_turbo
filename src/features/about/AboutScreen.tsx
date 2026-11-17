import Constants from 'expo-constants';
import { Linking, StyleSheet, View } from 'react-native';

import { strings } from '@/strings';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { AppText } from '@/ui/AppText';
import { Divider, Row, Section } from '@/ui/Blocks';
import { Screen } from '@/ui/Screen';

const t = strings.about;
export const SITE = 'https://guillaumegre.github.io/N5_turbo';
const open = (url: string) => () => Linking.openURL(url).catch(() => {});

/** What the app is, how studying works, where the words and sentences come from, and links. */
export function AboutScreen() {
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? '';
  return (
    <Screen title={t.title} titleJa={t.titleJa}>
      <View style={styles.hero}>
        <View style={[styles.mark, { backgroundColor: colors.inkCard }]}>
          <AppText style={[styles.markGlyph, { color: colors.onInk }]}>五</AppText>
        </View>
        <AppText style={styles.name}>{strings.appName}</AppText>
        <AppText muted style={styles.center}>{t.tagline}</AppText>
        {version ? <AppText variant="caption" faint>{t.version(version)}</AppText> : null}
      </View>

      <Section title={t.howTitle}>
        <View style={styles.how}>
          {t.how.map((p, i) => (
            <View key={i} style={styles.step}>
              <AppText style={[styles.stepN, { color: colors.accent }]}>{i + 1}</AppText>
              <AppText style={styles.stepText}>{p}</AppText>
            </View>
          ))}
        </View>
      </Section>

      <View>
        <Section title={t.dataTitle}>
          <Row glyph="辞" label={t.jmdict} sub={t.jmdictSub} onPress={open('https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project')} />
          <Divider />
          <Row glyph="文" label={t.tatoeba} sub={t.tatoebaSub} onPress={open('https://tatoeba.org')} />
          <Divider />
          <Row glyph="表" label={t.tanos} sub={t.tanosSub} onPress={open('https://www.tanos.co.uk/jlpt/jlpt5/vocab/')} />
        </Section>
        <AppText variant="caption" muted style={styles.note}>{t.vocabLicense}</AppText>
      </View>

      <Section title={t.appTitle}>
        <Row glyph="秘" label={t.privacy} sub={t.privacySub} onPress={open(`${SITE}/privacy-policy.html`)} />
        <Divider />
        <Row glyph="助" label={t.support} sub={t.supportSub} onPress={open(`${SITE}/support.html`)} />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 6, paddingTop: 8 },
  mark: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  markGlyph: { fontFamily: fonts.mincho, fontSize: 32 },
  name: { fontSize: 26, fontWeight: '300', letterSpacing: -0.5 },
  center: { textAlign: 'center' },
  how: { gap: 14 },
  step: { flexDirection: 'row', gap: 12 },
  stepN: { width: 14, fontSize: 15, fontWeight: '500' },
  stepText: { flex: 1, fontSize: 14.5, lineHeight: 21 },
  note: { marginTop: 8, marginLeft: 2 },
});
