const RESIZER = 'https://wsrv.nl/';

/** Fixed widths so every screen showing a product reuses the same cached file. */
export const IMAGE_WIDTH = {
  thumb: 240,
  card: 600,
  full: 1200,
} as const;

/** Joma's source photos are 1–2 MB JPEGs; the resizer serves them as small WebPs. */
export function sizedImage(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith('http') || url.startsWith(RESIZER) || url.includes('/_next/image?')) return url;
  return `${RESIZER}?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=75`;
}
