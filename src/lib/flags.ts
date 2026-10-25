import Constants from 'expo-constants';

import { flagFromExtra } from '@/src/lib/buildFlags';

/**
 * SERVER_QUOTE_CHECKOUT is fixed when the app is built.
 * It is never read from the API, links, push notifications, or user input.
 * Unset builds leave it off.
 */
export const SERVER_QUOTE_CHECKOUT = flagFromExtra(Constants.expoConfig?.extra, 'SERVER_QUOTE_CHECKOUT');
