import { View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

/** Star value shown as countable star icons (pre-readers can count them) plus the number. */
export function StarRow({
  count,
  size = 24,
  max = 5,
}: {
  count: number;
  size?: number;
  max?: number;
}) {
  const shown = Math.min(count, max);
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
      accessible
      accessibilityLabel={`${count} ${count === 1 ? 'star' : 'stars'}`}
    >
      {Array.from({ length: shown }, (_, i) => (
        <Icon key={i} name="star" size={size} color={colors.star} />
      ))}
      {count > max ? (
        <Txt variant="label" color={colors.starDeep}>
          +{count - max}
        </Txt>
      ) : null}
    </View>
  );
}

/** Compact pill: ★ 12 */
export function StarPill({
  value,
  big,
  tone = 'light',
  center,
}: {
  value: number;
  big?: boolean;
  tone?: 'light' | 'dark';
  center?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${value === 1 ? 'star' : 'stars'}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xxs,
        paddingHorizontal: big ? space.md : space.sm,
        paddingVertical: big ? space.xs : space.xxs,
        borderRadius: radius.round,
        backgroundColor: tone === 'light' ? colors.starLight : colors.ink,
        alignSelf: center ? 'center' : 'flex-start',
      }}
    >
      <Icon name="star" size={big ? 30 : 20} color={colors.star} />
      <Txt variant={big ? 'title' : 'label'} color={tone === 'light' ? colors.ink : colors.white}>
        {value}
      </Txt>
    </View>
  );
}
