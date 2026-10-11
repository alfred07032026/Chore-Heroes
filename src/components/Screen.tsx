import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLayout } from '@/hooks/useLayout';
import { colors, space } from '@/theme/tokens';

export function Screen({
  children,
  header,
  scroll = true,
  background = colors.bg,
  contentStyle,
  maxWidth,
}: {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  background?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Constrain content width on very wide screens (forms read better narrow). */
  maxWidth?: number;
}) {
  const { gutter } = useLayout();
  const inner = [
    { paddingHorizontal: gutter, paddingBottom: space.xl, width: '100%' as const },
    maxWidth ? { maxWidth, alignSelf: 'center' as const } : null,
    contentStyle,
  ];
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: background }]}
      edges={['top', 'left', 'right']}
    >
      {header ? <View style={{ paddingHorizontal: gutter }}>{header}</View> : null}
      {scroll ? (
        // iOS: shrink the scroll area above the keyboard so focused fields stay visible
        // (Android resizes the window itself).
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.root}
            contentContainerStyle={inner}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.root, ...inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
