import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { saveManualMarket } from '@/src/i18n/detect';
import { en } from '@/src/i18n/en';
import foldersFr from '@/src/i18n/folders.fr.json';
import { fr } from '@/src/i18n/fr';
import { MARKETS, type Market } from '@/src/i18n/market';
import { formatMoney as formatMarketMoney } from '@/src/lib/money';

type Vars = Record<string, string | number>;
type Translate = {
  (key: string, vars?: Vars): string;
  plural: (key: string, count: number, vars?: Vars) => string;
};

type LocaleValue = {
  market: Market;
  setMarket: (market: Market) => Promise<void>;
  t: Translate;
  formatMoney: (nad: number) => string;
  intlLocale: 'en-NA' | 'fr-FR';
  folderName: (key: string, fallback: string) => string;
};

const LocaleContext = createContext<LocaleValue | null>(null);
const dictionaries = { en, fr } as const;

function lookup(dictionary: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[part];
  }, dictionary);
}

function interpolate(message: string, vars: Vars = {}): string {
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

function makeTranslator(language: 'en' | 'fr'): Translate {
  const get = (key: string) => lookup(dictionaries[language], key) ?? lookup(en, key);
  const translate = ((key: string, vars?: Vars) => {
    const value = get(key);
    return interpolate(typeof value === 'string' ? value : key, vars);
  }) as Translate;
  translate.plural = (key, count, vars) => {
    const value = get(key);
    if (!value || typeof value !== 'object') return translate(key, { ...vars, count });
    const form = language === 'fr' ? (count <= 1 ? 'one' : 'other') : count === 1 ? 'one' : 'other';
    const message = (value as Record<string, unknown>)[form];
    return interpolate(typeof message === 'string' ? message : key, { ...vars, count });
  };
  return translate;
}

export function LocaleProvider({ initialMarket, children }: { initialMarket: Market; children: ReactNode }) {
  const [market, setMarketState] = useState(initialMarket);
  const config = MARKETS[market];
  const t = useMemo(() => makeTranslator(config.language), [config.language]);
  const setMarket = useCallback(async (next: Market) => {
    setMarketState(next);
    await saveManualMarket(next);
  }, []);
  const formatMoney = useCallback((nad: number) => formatMarketMoney(nad, market), [market]);
  const folderName = useCallback(
    (key: string, fallback: string) =>
      market === 'eu' ? (foldersFr as Record<string, string>)[key] ?? fallback : fallback,
    [market],
  );

  const value = useMemo<LocaleValue>(
    () => ({ market, setMarket, t, formatMoney, intlLocale: config.intlLocale, folderName }),
    [config.intlLocale, folderName, formatMoney, market, setMarket, t],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
