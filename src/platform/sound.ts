import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useAppStore } from '@/state/appStore';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  success: require('../../assets/sounds/success.wav'),
  celebrate: require('../../assets/sounds/celebrate.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  badge: require('../../assets/sounds/badge.wav'),
  gentle: require('../../assets/sounds/gentle.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

const players = new Map<SoundName, AudioPlayer>();
let configured = false;

function player(name: SoundName): AudioPlayer | null {
  try {
    if (!configured) {
      configured = true;
      // Ambient: mixes with other audio and respects the device's silent switch.
      void setAudioModeAsync({
        playsInSilentMode: false,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
      }).catch(() => undefined);
    }
    let p = players.get(name);
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = 0.8;
      players.set(name, p);
    }
    return p;
  } catch {
    return null;
  }
}

/** Plays a short UI sound (respects the Sound setting). Never throws. */
export function playSound(name: SoundName): void {
  if (!useAppStore.getState().settings.soundOn) return;
  const p = player(name);
  if (!p) return;
  try {
    void p.seekTo(0).then(
      () => p.play(),
      () => p.play(),
    );
  } catch {
    // ignore
  }
}
