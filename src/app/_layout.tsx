import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DataProvider, useSettings } from '@/data/DataProvider';
import { usePremiumSync } from '@/features/premium/usePremiumSync';
import { AppThemeProvider, useTheme } from '@/theme/ThemeProvider';

// The splash stays up until the database is open and seeded (DataProvider renders nothing before).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <ThemedApp />
      </DataProvider>
    </SafeAreaProvider>
  );
}

/** The theme comes from settings (light by default, dark or system on request), so it sits inside the data. */
function ThemedApp() {
  const { theme, fontScale } = useSettings();
  usePremiumSync();
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <AppThemeProvider preference={theme} fontScale={fontScale}>
      <AppStack />
    </AppThemeProvider>
  );
}

function AppStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Every screen draws its own TypeKana-style header (BackHeader). */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 140,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
