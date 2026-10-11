import { View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

/**
 * A star that stays visible on light backgrounds: yellow fill plus a dark-gold outline
 * (plain #FFC531 on white is only 1.6:1; the outline brings it to ≥4:1, WCAG 1.4.11).
 */
export function StarGlyph({ size = 24 }: { size?: number }) {
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon name="star" size={size} color={colors.star} />
      <View style={{ position: 'absolute' }}>
        <Icon name="star-outline" size={size} color={colors.starDeep} />
      </View>
    </View>
  );
}

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
        <StarGlyph key={i} size={size} />
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
      <StarGlyph size={big ? 30 : 20} />
      <Txt variant={big ? 'title' : 'label'} color={tone === 'light' ? colors.ink : colors.white}>
        {value}
      </Txt>
    </View>
  );
}
