import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { shopUrl } from '@/src/api/client';
import { openAccountDeletePage } from '@/src/lib/accountDelete';

export const SUPPORT_EMAIL = 'sales@rappisportshub.com';
export const SUPPORT_WHATSAPP = '264818141646';
export const SUPPORT_WHATSAPP_LABEL = '+264 81 814 1646';

/**
 * Opens the website delete page. The app does not call a delete API and does not send a token or key.
 * Coming back does not mean the account was deleted.
 */
export function openAccountDeletion(): Promise<void> {
  return openAccountDeletePage(
    (url) => WebBrowser.openBrowserAsync(url, { dismissButtonStyle: 'close' }),
    (url) => Linking.openURL(url),
  );
}

export type SitePage = 'privacy' | 'terms' | 'returns';

export function openSitePage(page: SitePage): void {
  void WebBrowser.openBrowserAsync(`${shopUrl()}/${page}`, { dismissButtonStyle: 'close' }).catch(() => undefined);
}

export function openWhatsApp(): void {
  void Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`).catch(() => undefined);
}

export function openSupportEmail(): void {
  const subject = encodeURIComponent('RAPPI Sports Hub enquiry');
  void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => undefined);
}
