/**
 * Chore Heroes design tokens.
 * Friendly, rounded "hero" theme: royal purple hero color, sunny star yellow, cream paper
 * background. Text colors meet WCAG AA (≥4.5:1) on both `bg` and `surface`.
 */
export const colors = {
  bg: '#FFF8EC',
  surface: '#FFFFFF',
  surfaceAlt: '#F3EEFF',
  ink: '#1E1A3C', // 15.6:1 on bg
  inkSoft: '#4A4566', // 8.3:1 on bg
  hero: '#5B3CC4', // primary — 7.0:1 white text
  heroDark: '#3F2A8C',
  heroLight: '#E7E0FF',
  star: '#FFC531',
  starDeep: '#9A6700', // star outlines/text on light bg (≥4.1:1 on every light surface)
  starLight: '#FFF1C7',
  success: '#257A36', // 5.4:1 white text; 4.7:1 as icon on successLight
  successLight: '#DDF5E3',
  danger: '#C92A2A', // 5.6:1 white text
  dangerLight: '#FFE3E3',
  sky: '#1971C2',
  skyLight: '#DCEBFB',
  flame: '#E8590C',
  flameLight: '#FFE8D6',
  waiting: '#5C7CFA',
  waitingLight: '#E5EBFF',
  border: '#E3DCCF',
  locked: '#B9B3C9', // decorative/disabled only — never behind meaningful icons
  lockedStrong: '#6E6888', // locked badge circles: white lock icon 5.3:1
  white: '#FFFFFF',
  overlay: 'rgba(30, 26, 60, 0.55)',
} as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const radius = { sm: 12, md: 18, lg: 26, xl: 36, round: 999 } as const;

/** Minimum touch target sizes (pt). Child side uses the larger value everywhere. */
export const touch = { parent: 48, child: 64, childLarge: 96 } as const;

export const fontSize = {
  caption: 14,
  body: 17,
  label: 19,
  heading: 22,
  title: 28,
  display: 40,
  hero: 56,
} as const;

export const shadow = {
  card: {
    shadowColor: '#1E1A3C',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#1E1A3C',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
