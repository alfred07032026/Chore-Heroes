import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, space, touch } from '@/theme/tokens';

import { Icon } from './Icon';
import { Pressy } from './Pressy';
import { Txt } from './Txt';

type Tone = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'star';

const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.hero, fg: colors.white },
  secondary: { bg: colors.surface, fg: colors.hero, border: colors.hero },
  success: { bg: colors.success, fg: colors.white },
  danger: { bg: colors.danger, fg: colors.white },
  ghost: { bg: 'transparent', fg: colors.hero },
  star: { bg: colors.star, fg: colors.ink },
};

export interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  tone?: Tone;
  /** 'child' = 64pt+ target with larger text; 'parent' = 48pt+. */
  size?: 'parent' | 'child' | 'compact';
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  full?: boolean;
}

export function Button({
  label,
  onPress,
  icon,
  tone = 'primary',
  size = 'parent',
  disabled,
  busy,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
  full,
}: ButtonProps) {
  const t = TONES[tone];
  const minHeight = size === 'child' ? touch.child : size === 'compact' ? 44 : touch.parent;
  return (
    <Pressy
      testID={testID}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      style={[
        styles.base,
        {
          minHeight,
          backgroundColor: t.bg,
          borderColor: t.border ?? 'transparent',
          paddingHorizontal: size === 'child' ? space.lg : space.md,
          opacity: disabled ? 0.45 : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
        tone !== 'ghost' && shadow.card,
        style,
      ]}
    >
      <View style={styles.row}>
        {busy ? (
          <ActivityIndicator color={t.fg} />
        ) : icon ? (
          <Icon name={icon} size={size === 'child' ? 32 : 22} color={t.fg} />
        ) : null}
        <Txt variant={size === 'child' ? 'heading' : 'label'} color={t.fg} center>
          {label}
        </Txt>
      </View>
    </Pressy>
  );
}

/** Round icon-only button (with mandatory accessibility label). */
export function IconButton({
  icon,
  onPress,
  label,
  size = touch.parent,
  tone = 'secondary',
  testID,
  badge,
}: {
  icon: string;
  onPress: () => void;
  label: string;
  size?: number;
  tone?: Tone;
  testID?: string;
  badge?: number;
}) {
  const t = TONES[tone];
  return (
    <Pressy
      testID={testID}
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.bg,
          borderWidth: t.border ? 2 : 0,
          borderColor: t.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tone !== 'ghost' && shadow.card,
      ]}
    >
      <Icon name={icon} size={size * 0.5} color={t.fg} />
      {badge ? (
        <View style={styles.badge}>
          <Txt variant="caption" weight="black" color={colors.white} maxFontSizeMultiplier={1.2}>
            {badge > 99 ? '99+' : badge}
          </Txt>
        </View>
      ) : null}
    </Pressy>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.round,
    borderWidth: 2,
    justifyContent: 'center',
    paddingVertical: space.xs,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
});
