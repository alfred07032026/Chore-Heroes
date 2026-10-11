import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useLayout } from '@/hooks/useLayout';
import { colors, space } from '@/theme/tokens';

import { Mascot } from './Mascot';
import { Txt } from './Txt';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
      <Mascot size={110} mood="calm" />
      <Txt variant="heading" center>
        {title}
      </Txt>
      {body ? (
        <Txt variant="body" center color={colors.inkSoft} style={{ maxWidth: 420 }}>
          {body}
        </Txt>
      ) : null}
      {action}
    </View>
  );
}

/**
 * Responsive two-pane layout: side by side on wide landscape screens, stacked otherwise.
 * `side` comes first when stacked only if `sideFirst` is set.
 */
export function TwoPane({
  main,
  side,
  sideWidth = 360,
  sideFirst = false,
  style,
}: {
  main: ReactNode;
  side: ReactNode;
  sideWidth?: number;
  sideFirst?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { twoPane } = useLayout();
  if (twoPane) {
    return (
      <View style={[{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }, style]}>
        <View style={{ flex: 1 }}>{main}</View>
        <View style={{ width: sideWidth }}>{side}</View>
      </View>
    );
  }
  return (
    <View style={[{ gap: space.md }, style]}>
      {sideFirst ? side : null}
      {main}
      {sideFirst ? null : side}
    </View>
  );
}

/** Wrapping grid with a fixed number of equal columns. */
export function Grid({
  columns,
  children,
  gap = space.md,
}: {
  columns: number;
  children: ReactNode[];
  gap?: number;
}) {
  const rows: ReactNode[][] = [];
  children.forEach((c, i) => {
    const r = Math.floor(i / columns);
    (rows[r] ??= []).push(c);
  });
  return (
    <View style={{ gap }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap }}>
          {row.map((c, ci) => (
            <View key={ci} style={{ flex: 1, flexBasis: 0 }}>
              {c}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Columns that fit `minWidth` cards. `reserved` = width taken by a side pane in two-pane mode
 * (only subtracted when the layout is actually two-pane).
 */
export function useGridColumns(minWidth: number, maxColumns = 4, reserved = 0) {
  const { width, gutter, twoPane } = useLayout();
  const available = width - gutter * 2 - (twoPane ? reserved + space.lg : 0);
  return Math.max(1, Math.min(maxColumns, Math.floor(available / minWidth)));
}
