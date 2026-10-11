// Global Jest setup: silence native-only modules that have no JS fallback in tests.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(async () => false),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Reanimated/worklets need native code; use their official Jest mocks.
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    volume: 1,
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));
