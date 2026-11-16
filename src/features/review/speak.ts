import * as Speech from 'expo-speech';

/** Native Japanese text-to-speech (device voice). Takes kana to avoid kanji misreadings. */
export function speakJapanese(kana: string): void {
  Speech.stop();
  Speech.speak(kana.replace(/[～〜]/g, ''), { language: 'ja-JP', rate: 0.9 });
}
