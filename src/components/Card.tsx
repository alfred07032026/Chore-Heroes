import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space } from '@/theme/tokens';

import { Txt } from './Txt';

export function Card({
  children,
  style,
  tint,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
}) {
  return (
    <View
      style={[
        { backgroundColor: tint ?? colors.surface, borderRadius: radius.lg, padding: space.md },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: space.lg,
        marginBottom: space.sm,
        gap: space.sm,
      }}
    >
      <Txt variant="heading" accessibilityRole="header" style={{ flexShrink: 1 }}>
        {children}
      </Txt>
      {right}
    </View>
  );
}
