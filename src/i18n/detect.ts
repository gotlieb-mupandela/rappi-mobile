import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

import { isMarket, type Market } from '@/src/i18n/market';

type DeviceLocale = { regionCode?: string | null; languageCode?: string | null; timeZone?: string | null };

function readDeviceLocale(): DeviceLocale {
  try {
    // Development builds made before expo-localization was added lack the native module.
    if (!requireOptionalNativeModule('ExpoLocalization')) throw new Error('ExpoLocalization unavailable');
    const localization = require('expo-localization') as typeof import('expo-localization');
    const locale = localization.getLocales()[0];
    return {
      regionCode: locale?.regionCode,
      languageCode: locale?.languageCode,
      timeZone: localization.getCalendars()[0]?.timeZone,
    };
  } catch {
    const options = Intl.DateTimeFormat().resolvedOptions();
    const [languageCode, ...rest] = options.locale.split('-');
    const regionCode = rest.find((part) => /^[A-Z]{2}$/.test(part));
    return { regionCode, languageCode, timeZone: options.timeZone };
  }
}

export const MARKET_KEY = 'market';
export const MARKET_SOURCE_KEY = 'marketSource';

const EU_REGIONS = new Set(
  'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE MC AD SM VA GF GP MQ RE YT BL MF PM'.split(' '),
);

const EU_TIME_ZONES = new Set([
  'Indian/Reunion',
  'America/Martinique',
  'America/Guadeloupe',
  'America/Cayenne',
  'Indian/Mayotte',
]);

export function detectDeviceMarket(): Market {
  const locale = readDeviceLocale();
  const region = locale.regionCode?.toUpperCase();
  if (region === 'NA') return 'na';
  if (region && EU_REGIONS.has(region)) return 'eu';
  if (locale.languageCode?.toLowerCase() === 'fr') return 'eu';

  const timeZone = locale.timeZone ?? '';
  if (timeZone === 'Africa/Windhoek') return 'na';
  if (timeZone.startsWith('Europe/') || EU_TIME_ZONES.has(timeZone)) return 'eu';
  return 'na';
}

export async function loadInitialMarket(): Promise<Market> {
  const [savedMarket, source] = await AsyncStorage.multiGet([MARKET_KEY, MARKET_SOURCE_KEY]);
  const market = savedMarket[1];
  if (source[1] === 'manual' && isMarket(market)) return market;

  const detected = detectDeviceMarket();
  await AsyncStorage.multiSet([
    [MARKET_KEY, detected],
    [MARKET_SOURCE_KEY, 'auto'],
  ]);
  return detected;
}

export async function saveManualMarket(market: Market): Promise<void> {
  await AsyncStorage.multiSet([
    [MARKET_KEY, market],
    [MARKET_SOURCE_KEY, 'manual'],
  ]);
}
