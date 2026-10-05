import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Product } from '@/src/api/types';
import { PressableScale } from '@/src/components/ui';
import { formatMoney } from '@/src/lib/money';
import { colors, fonts, radius } from '@/src/theme';

type Props = {
  product: Product;
};

type Badge = { label: string; tone: 'sold' | 'new' | 'offer' };

function badgeFor(product: Product): Badge | null {
  const sizes = product.sizes ?? [];
  const sold = sizes.length > 0 ? sizes.every((size) => size.stock <= 0) : product.stockQty <= 0;
  if (sold) return { label: 'Sold out', tone: 'sold' };
  if (product.badge === 'new') return { label: 'New', tone: 'new' };
  if (product.badge === 'offer') return { label: 'Offer', tone: 'offer' };
  return null;
}

export function ProductCard({ product }: Props) {
  const name = product.displayName || product.name;
  const badge = badgeFor(product);
  const href = { pathname: '/product/[code]' as const, params: { code: product.code } };

  return (
    <Link href={href} asChild>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${formatMoney(product.price)}${badge ? `, ${badge.label.toLowerCase()}` : ''}`}
        scaleTo={0.97}
        style={styles.card}>
        <View style={styles.well}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={[styles.image, badge?.tone === 'sold' && styles.soldImage]}
              contentFit="contain"
              cachePolicy="disk"
              transition={200}
            />
          ) : null}
          {badge ? (
            <View style={[styles.badge, styles[badge.tone]]}>
              <Text style={[styles.badgeText, badge.tone === 'new' ? styles.badgeTextDark : styles.badgeTextLight]}>{badge.label}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {name}
          </Text>
          <Text style={styles.price}>{formatMoney(product.price)}</Text>
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  well: {
    aspectRatio: 1,
    backgroundColor: colors.bg,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  soldImage: { opacity: 0.45 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  sold: { backgroundColor: colors.muted },
  new: { backgroundColor: colors.accent },
  offer: { backgroundColor: colors.text },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badgeTextDark: { color: colors.onAccent },
  badgeTextLight: { color: colors.onDark },
  body: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 14, gap: 6 },
  name: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
    color: colors.text,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
