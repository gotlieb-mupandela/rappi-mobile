import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { Product } from '@/src/api/types';
import { HeartButton } from '@/src/components/HeartButton';
import { PressableScale } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { IMAGE_WIDTH, sizedImage } from '@/src/lib/images';
import { makeStyles } from '@/src/lib/theme';
import { fonts, radius } from '@/src/theme';

type Props = {
  product: Product;
};

type Badge = { label: string; tone: 'sold' | 'new' | 'offer' };

function badgeFor(product: Product, labels: Record<Badge['tone'], string>): Badge | null {
  const sizes = product.sizes ?? [];
  const sold = sizes.length > 0 ? sizes.every((size) => size.stock <= 0) : product.stockQty <= 0;
  if (sold) return { label: labels.sold, tone: 'sold' };
  if (product.badge === 'new') return { label: labels.new, tone: 'new' };
  if (product.badge === 'offer') return { label: labels.offer, tone: 'offer' };
  return null;
}

export function ProductCard({ product }: Props) {
  const styles = useStyles();
  const { formatMoney, t } = useLocale();
  const name = product.displayName || product.name;
  const badge = badgeFor(product, {
    sold: t('product.soldOut'),
    new: t('product.new'),
    offer: t('product.offer'),
  });
  const badgeTextStyle = { sold: styles.badgeTextSold, new: styles.badgeTextAccent, offer: styles.badgeTextInverse };
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
              source={{ uri: sizedImage(product.imageUrl, IMAGE_WIDTH.card) }}
              style={[styles.image, badge?.tone === 'sold' && styles.soldImage]}
              contentFit="contain"
              cachePolicy="memory-disk"
              recyclingKey={product.code}
              transition={200}
            />
          ) : null}
          {badge ? (
            <View style={[styles.badge, styles[badge.tone]]}>
              <Text style={[styles.badgeText, badgeTextStyle[badge.tone]]}>{badge.label}</Text>
            </View>
          ) : null}
          {product.available === false ? null : <HeartButton code={product.code} id={product.id} name={name} variant="overlay" />}
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

const useStyles = makeStyles(({ colors }) => ({
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
    backgroundColor: colors.photo,
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
  offer: { backgroundColor: colors.inverse },
  badgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  badgeTextAccent: { color: colors.onAccent },
  badgeTextSold: { color: colors.bg },
  badgeTextInverse: { color: colors.onInverse },
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
}));
