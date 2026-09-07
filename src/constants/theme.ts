/**
 * Smriti-NER Theme & Design System
 * Tailored for elderly Bengali-speaking dementia patients (SIH PS 26003)
 * Core philosophy: Offline-first, Zero-UI/high-forgiveness, soft cream background (#FDFBF7),
 * massive tap targets, large Bengali-friendly typography.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2D241E', // Warm deep charcoal - softer on senior eyes than pure black
    background: '#FDFBF7', // Required soft cream background
    backgroundElement: '#F2ECE4', // Warm cream container
    backgroundSelected: '#E5DCD1',
    textSecondary: '#6B5F56',
    brand: '#B33927', // Warm Bengali terracotta
    brandLight: '#F9EAE7',
    amber: '#D97706', // Traditional warm marigold/amber
    amberLight: '#FEF3C7',
    olive: '#2C5E43', // Calming herbal green
    oliveLight: '#EAF3ED',
    surface: '#FFFFFF',
    border: '#E8DFD5',
    borderHighlight: '#C4B5A5',
    danger: '#DC2626',
    dangerLight: '#FEE2E2',
    success: '#16A34A',
  },
  dark: {
    // Graceful dark fallback adhering to warm tones
    text: '#FAF7F2',
    background: '#1F1B18',
    backgroundElement: '#2C2723',
    backgroundSelected: '#3E3732',
    textSecondary: '#C2B8AE',
    brand: '#D95C48',
    brandLight: '#3D2521',
    amber: '#F59E0B',
    amberLight: '#3A2E1A',
    olive: '#4D8A68',
    oliveLight: '#1C3125',
    surface: '#26221E',
    border: '#3D3630',
    borderHighlight: '#5A4F46',
    danger: '#EF4444',
    dangerLight: '#3A1E1E',
    success: '#22C55E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display), "Hind Siliguri", "Noto Sans Bengali", sans-serif',
    serif: 'var(--font-serif), "Noto Serif Bengali", serif',
    rounded: 'var(--font-rounded), sans-serif',
    mono: 'var(--font-mono), monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
  seven: 64,
} as const;

// Sizing specifically for elderly dementia care: massive tap targets & large typography
export const DementiaUX = {
  minTouchTarget: 72, // Minimum 72px for buttons & tab triggers
  largeButtonHeight: 64,
  iconSizeLarge: 38,
  iconSizeMedium: 28,
  borderRadiusLarge: 24,
  borderRadiusMedium: 16,
  cardPadding: 24,
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
