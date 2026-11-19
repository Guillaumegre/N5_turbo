import { Alert, Platform } from 'react-native';

import { strings } from '@/strings';

/** Alert has no buttons on the web: use the browser's dialogs there. */
export function notify(title: string, body: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${body}`);
  else Alert.alert(title, body);
}

export function confirm(title: string, body: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  return new Promise((resolve) =>
    Alert.alert(title, body, [
      { text: strings.settings.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
