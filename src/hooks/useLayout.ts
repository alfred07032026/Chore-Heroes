import { useWindowDimensions } from 'react-native';

export interface LayoutInfo {
  width: number;
  height: number;
  landscape: boolean;
  /** Wide enough for side-by-side panes (iPad landscape, large phones in landscape excluded). */
  twoPane: boolean;
  /** Number of grid columns for card grids. */
  columns: (minCardWidth: number) => number;
  /** Horizontal page padding. */
  gutter: number;
  isTablet: boolean;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const isTablet = Math.min(width, height) >= 600;
  const gutter = width >= 1000 ? 32 : width >= 700 ? 24 : 16;
  return {
    width,
    height,
    landscape,
    twoPane: landscape && width >= 900,
    isTablet,
    gutter,
    columns: (minCardWidth) => Math.max(1, Math.floor((width - gutter * 2) / minCardWidth)),
  };
}
