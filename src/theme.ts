import { Platform, StyleSheet } from 'react-native';

export const colors = {
  bg: '#ffffff',
  surface: '#f5f5f5',
  elevated: '#f9fafb',
  text: '#121212',
  muted: '#6b7280',
  border: 'rgba(0,0,0,0.1)',
  accent: '#41d113',
  accentBright: '#5be32f',
  /** Same hue as accent, dark enough for text on white (about 4.9:1). */
  accentText: '#24800b',
  accentDim: '#0d2604',
  accentMuted: 'rgba(65,209,19,0.14)',
  onAccent: '#121212',
  onDark: '#ffffff',
  danger: '#d1243a',
  warn: '#c4840c',
  imageWell: '#f3f4f6',
  scrim: 'rgba(0,0,0,0.45)',
};

export const fonts = {
  display: 'Oswald_600SemiBold',
  displayBold: 'Oswald_700Bold',
  body: 'Inter_400Regular',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const space = {
  screen: 20,
  gap: 12,
  topBar: 56,
};

export const radius = {
  card: 14,
  folder: 16,
  chip: 999,
  input: 10,
};

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
  }),
};

export const displayTitle = {
  fontFamily: fonts.displayBold,
  fontSize: 22,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
  color: colors.text,
};

export const sectionLabel = {
  fontFamily: fonts.display,
  fontSize: 12,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
  color: colors.muted,
};

export const buttonLabel = {
  fontFamily: fonts.display,
  fontSize: 14,
  letterSpacing: 0.6,
  textTransform: 'uppercase' as const,
};

export const hairline = StyleSheet.hairlineWidth;
