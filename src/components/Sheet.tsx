import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useLayout } from '@/hooks/useLayout';
import { useReduceMotion } from '@/state/appStore';
import { colors, radius, shadow, space } from '@/theme/tokens';

/** Centered modal card. Tapping the backdrop closes it (unless `dismissable` is false). */
export function Sheet({
  visible,
  onClose,
  children,
  dismissable = true,
  width = 560,
  testID,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
  width?: number;
  testID?: string;
}) {
  const reduce = useReduceMotion();
  const { width: screenW, height: screenH } = useLayout();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduce ? 'none' : 'fade'}
      onRequestClose={onClose}
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        testID={testID}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel="Close"
          accessible={dismissable}
        />
        <View
          style={[
            styles.card,
            shadow.raised,
            { width: Math.min(width, screenW - 32), maxHeight: screenH - 64 },
          ]}
          accessibilityViewIsModal
        >
          <ScrollView
            contentContainerStyle={{ padding: space.lg }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: colors.bg, borderRadius: radius.xl, overflow: 'hidden' },
});
