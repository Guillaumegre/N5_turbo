import { NotoSansJP_400Regular } from '@expo-google-fonts/noto-sans-jp/400Regular';
import { NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { strings } from '@/strings';
import { AppThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Deep imports so only the two weights we use get bundled (each is ~5.7 MB before subsetting).
  const [loaded, error] = useFonts({ NotoSansJP_400Regular, NotoSansJP_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AppThemeProvider>
      <AppStack />
    </AppThemeProvider>
  );
}

function AppStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}>
        <Stack.Screen name="index" options={{ title: strings.appName }} />
        <Stack.Screen name="review" options={{ title: strings.review.title }} />
        <Stack.Screen name="filters" options={{ title: strings.filters.title }} />
        <Stack.Screen name="words" options={{ title: strings.words.title }} />
        <Stack.Screen name="stats" options={{ title: strings.stats.title }} />
        <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
        <Stack.Screen name="about" options={{ title: strings.about.title }} />
      </Stack>
    </>
  );
}
