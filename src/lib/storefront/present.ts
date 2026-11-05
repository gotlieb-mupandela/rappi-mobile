import { formatMoney } from '../money.ts';
import { IMAGE_WIDTH, sizedImage } from '../images.ts';
import {
  CARD_FIT_ON_ROLLBACK,
  CARD_FIT_WHEN_FEED_OMITS,
  HOME_CROP_WHEN_FEED_OMITS,
  TILE_CROP_WHEN_FEED_OMITS,
  contentPositionFor,
  sameImageFile,
  type FeedContentPosition,
  type FeedImageFit,
} from './crop.ts';
import { productLabel } from './contract.ts';
import type { StorefrontLanguage, StorefrontProduct } from './types.ts';

export type CatalogSnapshot = {
  name?: string;
  imageUrl?: string;
  images?: string[];
  price?: number;
};

export type PresentedProduct = {
  name: string;
  /** Card photo. Feed cardImage on the feed path, otherwise the catalog imageUrl. */
  imageUrl: string | undefined;
  fromFeedImage: boolean;
  /** Gallery in feed order when the feed sent any. Otherwise the catalog gallery. */
  images: string[];
  fromFeedGallery: boolean;
  imageFit: FeedImageFit;
  contentPosition: FeedContentPosition;
  price: number;
  /** Feed priceLabel on the Namibia feed path. Otherwise formatMoney of the price. */
  priceLabel: string;
  packLabel: string | null;
  /** Feed badge (label / labelFr). Hidden when it repeats the title. */
  badgeLabel: string | null;
};

export type PresentedTile = {
  image: string | null;
  objectPosition: string | null;
  imageFit: FeedImageFit | null;
  contentPosition: FeedContentPosition;
};

/**
 * What the app shows for one product.
 * Feed path: cardImage, images, price, priceLabel, name, imageFit, objectPosition.
 * A missing field falls back to the catalog value, then to the previous card fit.
 * Rollback ignores feed photos and prices and uses the catalog, as main does.
 */
export function presentProduct(
  language: StorefrontLanguage,
  market: 'na' | 'eu',
  feed: StorefrontProduct | null | undefined,
  catalog: CatalogSnapshot | undefined,
  rollback: boolean,
): PresentedProduct {
  const catalogName = catalog?.name?.trim() ?? '';
  const catalogPrice = typeof catalog?.price === 'number' && Number.isFinite(catalog.price) ? catalog.price : 0;
  const badgeLabel = feed ? productLabel(language, feed) : null;

  if (rollback || !feed) {
    const imageUrl = catalog?.imageUrl || undefined;
    const images = (catalog?.images ?? []).filter((item) => item.length > 0);
    return {
      name: catalogName,
      imageUrl,
      fromFeedImage: false,
      images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
      fromFeedGallery: false,
      imageFit: CARD_FIT_ON_ROLLBACK,
      contentPosition: contentPositionFor(null, 'center'),
      price: catalogPrice,
      priceLabel: formatMoney(catalogPrice, market),
      packLabel: null,
      badgeLabel: null,
    };
  }

  const name = feed.name?.trim() || badgeLabel || catalogName;
  const imageUrl = feed.cardImage || catalog?.imageUrl || undefined;
  const fromFeedImage = Boolean(feed.cardImage);
  const fromFeedGallery = feed.images.length > 0;
  const images = fromFeedGallery ? [...feed.images] : (catalog?.images ?? []).filter((item) => item.length > 0);
  const price = feed.price ?? catalogPrice;
  const priceLabel =
    market === 'na' && feed.priceLabel ? feed.priceLabel : formatMoney(price, market);
  return {
    name,
    imageUrl,
    fromFeedImage,
    images: images.length > 0 ? images : imageUrl ? [imageUrl] : [],
    fromFeedGallery,
    imageFit: feed.imageFit ?? CARD_FIT_WHEN_FEED_OMITS,
    contentPosition: contentPositionFor(feed.objectPosition, 'center'),
    price,
    priceLabel,
    packLabel: feed.packLabel,
    badgeLabel: badgeLabel && badgeLabel !== name ? badgeLabel : null,
  };
}

/** URI passed to the image view. Feed URLs stay intact, including ?v=. */
export function displayUri(url: string | undefined, fromFeed: boolean, width: number = IMAGE_WIDTH.card): string | undefined {
  if (!url) return undefined;
  if (fromFeed) return url;
  return sizedImage(url, width);
}

export function presentTile(
  tile: { image: string | null; objectPosition?: string | null; imageFit?: FeedImageFit | null },
  fallback: FeedContentPosition,
): PresentedTile {
  return {
    image: tile.image,
    objectPosition: tile.objectPosition ?? null,
    imageFit: tile.imageFit ?? null,
    contentPosition: contentPositionFor(tile.objectPosition, fallback),
  };
}

export function homeTilePresentation(tile: {
  image: string | null;
  objectPosition?: string | null;
  imageFit?: FeedImageFit | null;
}): PresentedTile {
  return presentTile(tile, HOME_CROP_WHEN_FEED_OMITS);
}

export function plainTilePresentation(tile: {
  image: string | null;
  objectPosition?: string | null;
  imageFit?: FeedImageFit | null;
}): PresentedTile {
  return presentTile(tile, TILE_CROP_WHEN_FEED_OMITS);
}

/**
 * Athlete tile photo.
 * Prefer the audience row image (sportswear.audiences[].image).
 * Otherwise the men, women, or kids node image.
 * Never the category hub cover, even when that file is copied onto the kids node.
 */
export function athleteTileImage(input: {
  audienceImage?: string | null;
  nodeImage?: string | null;
  hubCover?: string | null;
}): string | null {
  if (input.audienceImage && !sameImageFile(input.audienceImage, input.hubCover)) return input.audienceImage;
  if (input.nodeImage && !sameImageFile(input.nodeImage, input.hubCover)) return input.nodeImage;
  return null;
}

export function audienceSlugFromId(id: string): 'men' | 'women' | 'kids' | null {
  const tail = id.split('--').pop() ?? '';
  if (tail === 'men' || tail === 'women' || tail === 'kids') return tail;
  if (id === 'men' || id === 'women' || id === 'kids') return id;
  return null;
}
