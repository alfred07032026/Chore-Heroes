import { type ReactNode } from 'react';
import { View } from 'react-native';

import { colors, radius, shadow, space, touch } from '@/theme/tokens';

import { Icon, IconBubble } from '../Icon';
import { Pressy } from '../Pressy';
import { Txt } from '../Txt';

export function ListRow({
  icon,
  iconColor = colors.hero,
  iconBg,
  title,
  subtitle,
  right,
  onPress,
  selected,
  muted,
  testID,
  leading,
}: {
  icon?: string;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  muted?: boolean;
  testID?: string;
  leading?: ReactNode;
}) {
  const body = (
    <>
      {leading ??
        (icon ? <IconBubble name={icon} size={52} color={iconColor} background={iconBg} /> : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="label" color={muted ? colors.inkSoft : colors.ink} numberOfLines={2}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" color={colors.inkSoft} numberOfLines={3}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron-right" size={26} color={colors.inkSoft} /> : null}
    </>
  );
  const style = [
    {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: space.md,
      padding: space.sm,
      minHeight: touch.child,
      borderRadius: radius.md,
      backgroundColor: selected ? colors.heroLight : colors.surface,
      borderWidth: 2,
      borderColor: selected ? colors.hero : 'transparent',
      opacity: muted ? 0.75 : 1,
    },
    shadow.card,
  ];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressy
      onPress={onPress}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={style}
      scaleTo={0.98}
      testID={testID}
    >
      {body}
    </Pressy>
  );
}
