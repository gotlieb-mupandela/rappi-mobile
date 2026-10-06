import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

import { apiFetch, shopUrl } from '@/src/api/client';

export const SUPPORT_EMAIL = 'sales@rappisportshub.com';
export const SUPPORT_WHATSAPP = '264818141646';
export const SUPPORT_WHATSAPP_LABEL = '+264 81 814 1646';

export async function deleteAccount(): Promise<void> {
  await apiFetch('/api/account/delete', {
    method: 'POST',
    auth: true,
    fallbackMessage: "Couldn't delete your account. Try again.",
  });
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
