import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt, type TxtVariant } from './Txt';

/**
 * Error message that is (1) shown with an icon, not color alone, and (2) announced by
 * VoiceOver and TalkBack when it appears.
 */
export function ErrorText({
  children,
  variant = 'body',
  center,
}: {
  children: string | null | undefined;
  variant?: TxtVariant;
  center?: boolean;
}) {
  useEffect(() => {
    if (children) AccessibilityInfo.announceForAccessibility(children);
  }, [children]);
  if (!children) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xxs,
        justifyContent: center ? 'center' : 'flex-start',
      }}
      accessible
      accessibilityLabel={children}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Icon name="alert-circle" size={20} color={colors.danger} />
      <Txt variant={variant} color={colors.danger} style={{ flexShrink: 1 }} center={center}>
        {children}
      </Txt>
    </View>
  );
}
