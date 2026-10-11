import { useAppStore } from '@/state/appStore';

import { haptic } from './haptics';
import { playSound, type SoundName } from './sound';
import { speak } from './speech';

/** One call for the sound + haptic + voice trio used by child interactions. */
export function feedback(opts: {
  sound?: SoundName;
  haptic?: 'tap' | 'success' | 'warning';
  say?: string;
}) {
  const { soundOn } = useAppStore.getState().settings;
  if (opts.sound) playSound(opts.sound);
  if (opts.haptic) haptic(opts.haptic, soundOn);
  if (opts.say) speak(opts.say);
}
