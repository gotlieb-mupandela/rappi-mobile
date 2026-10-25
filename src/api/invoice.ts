import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { ApiError, authorizedResponse } from '@/src/api/client';

function isPdf(bytes: Uint8Array, contentType: string): boolean {
  if (contentType.toLowerCase().includes('pdf')) return true;
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function messageFromBody(bytes: Uint8Array, status: number, fallback: string): ApiError {
  const text = new TextDecoder().decode(bytes);
  try {
    const json = JSON.parse(text) as { error?: string };
    if (typeof json.error === 'string' && json.error) return new ApiError(json.error, status);
  } catch {
    // Not a JSON error page.
  }
  return new ApiError(fallback, status || 502);
}

function downloadOnWeb(bytes: Uint8Array, filename: string): void {
  const host = globalThis as typeof globalThis & {
    document?: { createElement: (tag: string) => { href: string; download: string; click: () => void } };
    URL?: { createObjectURL: (blob: Blob) => string; revokeObjectURL: (url: string) => void };
  };
  if (!host.document || !host.URL) {
    throw new ApiError("Couldn't download the invoice.", 0);
  }
  const url = host.URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' }));
  const anchor = host.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  host.URL.revokeObjectURL(url);
}

/** Downloads the website invoice and hands it to the share sheet, or saves it on web. */
export async function shareInvoice(orderId: string): Promise<void> {
  const fallback = "Couldn't download the invoice.";
  const response = await authorizedResponse(`/api/orders/${encodeURIComponent(orderId)}/invoice`, {
    accept: 'application/pdf, application/json',
    fallbackMessage: fallback,
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !isPdf(bytes, contentType)) {
    throw messageFromBody(bytes, response.status, fallback);
  }

  const filename = `invoice-${orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'order'}.pdf`;
  if (Platform.OS === 'web') {
    downloadOnWeb(bytes, filename);
    return;
  }

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(bytes);
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError(fallback, 0);
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Invoice',
  });
}
