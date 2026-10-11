import * as Speech from 'expo-speech';

import { useAppStore } from '@/state/appStore';

/** Speaks a label for pre-readers (respects the Voice setting). Never throws. */
export function speak(text: string): void {
  if (!useAppStore.getState().settings.voiceOn || !text) return;
  try {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.9, pitch: 1.05 });
  } catch {
    // Text-to-speech unavailable (e.g. no voices installed); the UI never depends on it.
  }
}

export function stopSpeaking(): void {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}
