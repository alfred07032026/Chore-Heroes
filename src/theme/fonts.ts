import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';

export const FONT_ASSETS = {
  Nunito_600SemiBold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  OpenDyslexic: require('../../assets/fonts/OpenDyslexic-Regular.ttf'),
  'OpenDyslexic-Bold': require('../../assets/fonts/OpenDyslexic-Bold.ttf'),
};

export type Weight = 'regular' | 'bold' | 'black';

export function fontFamily(weight: Weight, dyslexic: boolean): string {
  if (dyslexic) return weight === 'regular' ? 'OpenDyslexic' : 'OpenDyslexic-Bold';
  switch (weight) {
    case 'regular':
      return 'Nunito_600SemiBold';
    case 'bold':
      return 'Nunito_800ExtraBold';
    case 'black':
      return 'Nunito_900Black';
  }
}
