import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, fontSize } from '@/theme/tokens';
import { fontFamily, type Weight } from '@/theme/fonts';
import { useAppStore } from '@/state/appStore';

export type TxtVariant = 'hero' | 'display' | 'title' | 'heading' | 'label' | 'body' | 'caption';

const VARIANTS: Record<
  TxtVariant,
  { size: number; weight: Weight; lineHeight: number; maxScale: number }
> = {
  hero: { size: fontSize.hero, weight: 'black', lineHeight: 1.1, maxScale: 1.3 },
  display: { size: fontSize.display, weight: 'black', lineHeight: 1.15, maxScale: 1.4 },
  title: { size: fontSize.title, weight: 'black', lineHeight: 1.2, maxScale: 1.6 },
  heading: { size: fontSize.heading, weight: 'bold', lineHeight: 1.25, maxScale: 1.8 },
  label: { size: fontSize.label, weight: 'bold', lineHeight: 1.3, maxScale: 2 },
  body: { size: fontSize.body, weight: 'regular', lineHeight: 1.4, maxScale: 2.2 },
  caption: { size: fontSize.caption, weight: 'regular', lineHeight: 1.35, maxScale: 2.2 },
};

export interface TxtProps extends TextProps {
  variant?: TxtVariant;
  color?: string;
  weight?: Weight;
  center?: boolean;
}

/**
 * All app text. Supports Dynamic Type up to a per-variant cap (big headings would otherwise
 * overflow cards at the largest accessibility sizes) and the dyslexia-friendly font setting.
 */
export function Txt({
  variant = 'body',
  color = colors.ink,
  weight,
  center,
  style,
  ...rest
}: TxtProps) {
  const dyslexic = useAppStore((s) => s.settings.dyslexicFont);
  const v = VARIANTS[variant];
  // OpenDyslexic glyphs are wider; scale down slightly so layouts keep fitting.
  const size = dyslexic ? Math.round(v.size * 0.9) : v.size;
  const base: TextStyle = {
    fontFamily: fontFamily(weight ?? v.weight, dyslexic),
    fontSize: size,
    lineHeight: Math.round(size * v.lineHeight * (dyslexic ? 1.15 : 1)),
    color,
    textAlign: center ? 'center' : undefined,
  };
  return <Text maxFontSizeMultiplier={v.maxScale} {...rest} style={[base, style]} />;
}
