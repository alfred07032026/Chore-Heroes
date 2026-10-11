import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space, touch } from '@/theme/tokens';

import { IconButton } from './Button';
import { Txt } from './Txt';

export function TopBar({
  title,
  onBack,
  backLabel = 'Back',
  right,
  child,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  /** Child screens get larger targets. */
  child?: boolean;
}) {
  return (
    <View style={styles.bar}>
      {onBack ? (
        <IconButton
          icon="arrow-left"
          label={backLabel}
          onPress={onBack}
          size={child ? touch.child : touch.parent}
          testID="back-button"
        />
      ) : null}
      <View style={styles.titles}>
        {title ? (
          <Txt variant="title" accessibilityRole="header" numberOfLines={2}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt variant="body" color={colors.inkSoft} numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    minHeight: touch.child + space.md,
  },
  titles: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
