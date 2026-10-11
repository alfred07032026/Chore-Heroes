import { ActivityIndicator, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { Screen } from './Screen';
import { Txt } from './Txt';

/** Shown while a screen's data loads, so children never see a blank screen. */
export function LoadingScreen() {
  return (
    <Screen scroll={false}>
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md }}
        accessible
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
      >
        <ActivityIndicator size="large" color={colors.hero} />
        <Txt variant="label" color={colors.inkSoft}>
          Loading…
        </Txt>
      </View>
    </Screen>
  );
}
