import { existsSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

// Android can't receive push notifications without Firebase config. EAS can supply it as a file env var instead.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ?? (existsSync('./google-services.json') ? './google-services.json' : undefined);

// Same on-values as parseFlag in src/lib/flags.ts. Any other value stays off.
function envFlag(value: string | undefined): boolean {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
}

const config: ExpoConfig = {
  name: 'Rappi Sport',
  slug: 'rappi-sport',
  owner: 'classic_gotlieb',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/app-icon.png',
  scheme: 'rappisport',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.rappisportshub.app',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.rappisporthub.app',
    googleServicesFile,
    adaptiveIcon: {
      backgroundColor: '#121212',
      foregroundImage: './assets/images/adaptive-foreground.png',
      monochromeImage: './assets/images/adaptive-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/app-icon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-notifications',
      {
        color: '#41d113',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Rappi Sport uses your photos so you can choose a profile picture.',
        cameraPermission: 'Rappi Sport uses the camera so you can take a profile picture.',
        microphonePermission: false,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#121212',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'e6d1496d-3f53-46d4-8db8-9d837ad45641',
    },
    flags: {
      PARITY_STOREFRONT: envFlag(process.env.EXPO_PUBLIC_PARITY_STOREFRONT),
      PARITY_CARD_IMAGE: envFlag(process.env.EXPO_PUBLIC_PARITY_CARD_IMAGE),
      HIDE_EUR_MARKET: envFlag(process.env.EXPO_PUBLIC_HIDE_EUR_MARKET),
    },
  },
};

export default config;
