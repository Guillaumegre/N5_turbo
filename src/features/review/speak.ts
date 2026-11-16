import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';

import { strings } from '@/strings';

let prepared: Promise<void> | null = null;
let japaneseVoice: string | undefined;
let noVoiceWarned = false;

/**
 * One-time setup:
 * - iOS mutes speech when the silent switch is on unless the audio session allows
 *   playback in silent mode (the norm for language apps);
 * - pick an installed Japanese voice explicitly (the best quality available).
 */
function prepare(): Promise<void> {
  prepared ??= (async () => {
    if (Platform.OS !== 'web') {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
      } catch {
        // Speech still works when the switch is off.
      }
    }
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const ja = voices.filter((v) => v.language?.toLowerCase().replace('_', '-').startsWith('ja'));
      japaneseVoice = (ja.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? ja[0])?.identifier;
      if (!ja.length && Platform.OS !== 'web' && !noVoiceWarned) {
        noVoiceWarned = true;
        Alert.alert(strings.speech.noVoiceTitle, Platform.OS === 'ios' ? strings.speech.noVoiceIos : strings.speech.noVoiceAndroid);
      }
    } catch {
      // Voice list unavailable: let the engine choose from the language code.
    }
  })();
  return prepared;
}

/** Native Japanese text-to-speech (device voice). Takes kana to avoid kanji misreadings. */
export async function speakJapanese(kana: string): Promise<void> {
  await prepare();
  Speech.stop();
  Speech.speak(kana.replace(/[～〜]/g, ''), { language: 'ja-JP', voice: japaneseVoice, rate: 0.9 });
}
