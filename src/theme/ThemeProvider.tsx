import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { palette, type ColorScheme, type Colors } from './colors';

export type ThemePreference = 'system' | ColorScheme;

type Theme = {
  scheme: ColorScheme;
  colors: Colors;
  /** Accessibility multiplier applied to all font sizes. */
  fontScale: number;
};

const ThemeContext = createContext<Theme | null>(null);

type Props = {
  children: ReactNode;
  /** Will come from persisted settings (milestone 6). */
  preference?: ThemePreference;
  fontScale?: number;
};

export function AppThemeProvider({ children, preference = 'system', fontScale = 1 }: Props) {
  const system = useColorScheme();
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<Theme>(
    () => ({ scheme, colors: palette[scheme], fontScale }),
    [scheme, fontScale],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside <AppThemeProvider>');
  return theme;
}
