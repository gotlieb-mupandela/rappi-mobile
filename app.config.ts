import type { ExpoConfig } from 'expo/config';

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
    package: 'com.rappisportshub.app',
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
  },
};

export default config;
