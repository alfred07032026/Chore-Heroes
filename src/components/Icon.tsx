import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({
  name,
  size = 28,
  color = colors.ink,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <MaterialCommunityIcons
      name={name as GlyphName}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** Icon in a soft colored circle: the main visual language for tasks and rewards. */
export function IconBubble({
  name,
  size = 64,
  color = colors.hero,
  background,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background ?? colors.heroLight,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={name} size={size * 0.56} color={color} />
    </View>
  );
}
