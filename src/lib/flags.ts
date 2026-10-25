// Build-time feature flags. Every default is off, so the app keeps today's behaviour.
// The values are fixed when this module loads. Read them with isOn().
// Do not pass a URL, deep link, push payload, API response, or typed user input
// into isOn, parseFlag, or resolveFlag. Those are not flag sources.

declare function require(moduleName: string): unknown;

export const FLAG_NAMES = ['PARITY_STOREFRONT', 'PARITY_CARD_IMAGE', 'HIDE_EUR_MARKET'] as const;

export type FlagName = (typeof FLAG_NAMES)[number];

const ON_TOKENS = new Set(['1', 'true', 'on', 'yes']);

type ExpoConstantsModule = {
  expoConfig?: { extra?: { flags?: unknown } } | null;
  default?: ExpoConstantsModule;
};

/** Build-time parser. Only an explicit on token or boolean true enables a flag. */
export function parseFlag(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return ON_TOKENS.has(value.trim().toLowerCase());
}

/**
 * Env wins when it is set, including when the env value is unknown (that stays off).
 * Missing env falls through to the Expo config extra value.
 */
export function resolveFlag(envValue: string | undefined, extraValue: unknown): boolean {
  if (envValue !== undefined) return parseFlag(envValue);
  return parseFlag(extraValue);
}

function readExtraFlags(): Partial<Record<FlagName, unknown>> {
  try {
    // Static require so Metro bundles expo-constants. Node unit tests have no
    // require in scope, and the catch below leaves extra empty (defaults off).
    const loaded = require('expo-constants') as ExpoConstantsModule;
    const constants = loaded.expoConfig !== undefined ? loaded : loaded.default;
    const flags = constants?.expoConfig?.extra?.flags;
    if (!flags || typeof flags !== 'object' || Array.isArray(flags)) return {};
    return flags as Partial<Record<FlagName, unknown>>;
  } catch {
    return {};
  }
}

const extraFlags = readExtraFlags();

// Static process.env.EXPO_PUBLIC_* reads so Expo can inline them at bundle time.
export const FLAGS: Readonly<Record<FlagName, boolean>> = Object.freeze({
  PARITY_STOREFRONT: resolveFlag(process.env.EXPO_PUBLIC_PARITY_STOREFRONT, extraFlags.PARITY_STOREFRONT),
  PARITY_CARD_IMAGE: resolveFlag(process.env.EXPO_PUBLIC_PARITY_CARD_IMAGE, extraFlags.PARITY_CARD_IMAGE),
  HIDE_EUR_MARKET: resolveFlag(process.env.EXPO_PUBLIC_HIDE_EUR_MARKET, extraFlags.HIDE_EUR_MARKET),
});

export function isOn(flag: FlagName): boolean {
  return FLAGS[flag] === true;
}
