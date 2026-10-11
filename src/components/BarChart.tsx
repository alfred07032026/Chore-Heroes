import { View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Txt } from './Txt';

/** Simple accessible bar chart (stars per day). Each bar is labeled; the whole chart has a summary. */
export function BarChart({
  data,
  height = 160,
  highlight,
}: {
  data: { label: string; value: number; longLabel?: string; key: string }[];
  height?: number;
  highlight?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const summary = data.map((d) => `${d.longLabel ?? d.label}: ${d.value}`).join(', ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Stars per day. ${summary}`}>
      <View
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, height: height + 28 }}
      >
        {data.map((d) => {
          const h = Math.max(4, (d.value / max) * height);
          const isHi = d.key === highlight;
          return (
            <View key={d.key} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Txt variant="caption" weight="bold" maxFontSizeMultiplier={1.3}>
                {d.value}
              </Txt>
              <View
                style={{
                  width: '70%',
                  maxWidth: 44,
                  height: h,
                  borderRadius: radius.sm,
                  backgroundColor: d.value === 0 ? colors.border : isHi ? colors.hero : colors.star,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.xxs }}>
        {data.map((d) => (
          <View key={d.key} style={{ flex: 1, alignItems: 'center' }}>
            <Txt
              variant="caption"
              weight={d.key === highlight ? 'bold' : 'regular'}
              color={d.key === highlight ? colors.hero : colors.inkSoft}
              maxFontSizeMultiplier={1.3}
            >
              {d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
