import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { isUnavailableStatus } from '@/src/api/client';
import { fetchProduct } from '@/src/api/product';
import { fetchStock } from '@/src/api/stock';
import type { Product, StockResponse } from '@/src/api/types';
import { SizePicker } from '@/src/components/SizePicker';
import { EmptyState, ErrorState, PressableScale, Screen, SecondaryButton, SkeletonBlock, TextButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';
import { tapHaptic } from '@/src/lib/haptics';
import { IMAGE_WIDTH, sizedImage } from '@/src/lib/images';
import { useReducedMotion } from '@/src/lib/motion';
import { openLogin } from '@/src/lib/navigation';
import { defaultSize, isAvailable, isOneSize, isSoldOut, productSizes, stockLine } from '@/src/lib/sizes';
import { useToast } from '@/src/lib/toast';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { useWishlist, useWishlistActions, type WishlistEntry } from '@/src/lib/wishlist';
import { fonts, radius, space } from '@/src/theme';

type Row =
  | { kind: 'item'; entry: WishlistEntry; product: Product }
  | { kind: 'loading'; entry: WishlistEntry }
  | { kind: 'failed'; entry: WishlistEntry; retry: () => void };

type GoneItem = { entry: WishlistEntry; product?: Product };

export default function WishlistScreen() {
  const styles = useStyles();
  const wishlist = useWishlist();
  const { user } = useAuth();
  const { removeWithUndo } = useWishlistActions();
  const reducedMotion = useReducedMotion();
  const [refreshing, setRefreshing] = useState(false);
  const codes = useMemo(() => wishlist.entries.map((entry) => entry.code), [wishlist.entries]);

  const products = useQueries({
    queries: codes.map((code) => ({
      queryKey: ['product', code],
      queryFn: () => fetchProduct(code),
      retry: (count: number, error: Error) => !isUnavailableStatus(error) && count < 1,
    })),
  });

  const stock = useQuery({
    queryKey: ['stock', 'wishlist', codes.join(',')],
    queryFn: () => fetchStock(codes),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: false,
  });
  const refetchStock = stock.refetch;
  const hasCodes = codes.length > 0;
  useFocusEffect(
    useCallback(() => {
      if (hasCodes) void refetchStock();
    }, [hasCodes, refetchStock]),
  );

  const { learnIds } = wishlist;
  const idsJson = JSON.stringify(
    Object.fromEntries(products.flatMap((result) => (result.data?.id ? [[result.data.code, result.data.id]] : []))),
  );
  useEffect(() => {
    learnIds(JSON.parse(idsJson) as Record<string, string>);
  }, [idsJson, learnIds]);

  const rows: Row[] = [];
  const gone: GoneItem[] = [];
  wishlist.entries.forEach((entry, index) => {
    const result = products[index];
    if (!result) return;
    if (isUnavailableStatus(result.error)) gone.push({ entry });
    else if (result.data && !isAvailable(result.data, stock.data)) gone.push({ entry, product: result.data });
    else if (result.data) rows.push({ kind: 'item', entry, product: result.data });
    else if (result.isError) rows.push({ kind: 'failed', entry, retry: () => void result.refetch() });
    else rows.push({ kind: 'loading', entry });
  });
  const allFailed = rows.length > 0 && gone.length === 0 && rows.every((row) => row.kind === 'failed');

  const animate = () => {
    if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };
  const remove = (code: string) => {
    animate();
    removeWithUndo(code);
  };
  const clearGone = () => {
    animate();
    tapHaptic();
    gone.forEach((item) => wishlist.remove(item.entry.code));
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      wishlist.refresh(),
      stock.refetch(),
      ...products.filter((result) => result.isError).map((result) => result.refetch()),
    ]);
    setRefreshing(false);
  };

  let body: React.ReactNode;
  if (!wishlist.ready) {
    body = (
      <View style={styles.list}>
        <SkeletonBlock style={styles.skeleton} />
        <SkeletonBlock style={styles.skeleton} />
      </View>
    );
  } else if (wishlist.count === 0) {
    body = (
      <View style={styles.flex}>
        <EmptyState
          icon="heart-outline"
          message="Tap the heart on anything you like and it'll wait for you here."
          action="Browse shop"
          onPress={() => router.navigate('/(tabs)/shop')}
        />
        {user ? null : (
          <View style={styles.emptyFooter}>
            <TextButton label="Saved items before? Sign in to see them" onPress={() => openLogin('/wishlist')} />
          </View>
        )}
      </View>
    );
  } else if (allFailed) {
    body = <ErrorState message="Can't load your wishlist" onRetry={() => void refresh()} />;
  } else {
    body = (
      <FlatList
        data={rows}
        keyExtractor={(row) => row.entry.code}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        ListHeaderComponent={<ListHeader count={wishlist.count} synced={wishlist.synced} />}
        renderItem={({ item: row }) =>
          row.kind === 'item' ? (
            <WishlistItem entry={row.entry} product={row.product} stock={stock.data} onRemove={() => remove(row.entry.code)} />
          ) : row.kind === 'loading' ? (
            <SkeletonBlock style={styles.skeleton} />
          ) : (
            <View style={styles.failed}>
              <Text style={styles.failedText}>Couldn't load this item.</Text>
              <TextButton label="Retry" onPress={row.retry} />
            </View>
          )
        }
        ListFooterComponent={gone.length ? <GoneSection items={gone} onRemove={remove} onClear={clearGone} /> : null}
      />
    );
  }

  return (
    <Screen title="Wishlist" back>
      {body}
    </Screen>
  );
}

function ListHeader({ count, synced }: { count: number; synced: boolean }) {
  const { colors, sectionLabel } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={sectionLabel}>
          {count} {count === 1 ? 'item' : 'items'} saved
        </Text>
        {synced ? (
          <View style={styles.synced}>
            <Ionicons name="cloud-done-outline" size={14} color={colors.accentText} />
            <Text style={styles.syncedText}>Saved to your account</Text>
          </View>
        ) : null}
      </View>
      {synced ? null : (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Sign in to keep your wishlist on every device"
          scaleTo={0.985}
          onPress={() => {
            tapHaptic();
            openLogin('/wishlist');
          }}
          style={styles.promo}>
          <View style={styles.promoIcon}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.accentText} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.promoTitle}>Keep your wishlist safe</Text>
            <Text style={styles.promoText}>Sign in to save it to your account and see it on every device.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </PressableScale>
      )}
    </View>
  );
}

function WishlistItem({
  entry,
  product,
  stock,
  onRemove,
}: {
  entry: WishlistEntry;
  product: Product;
  stock?: StockResponse;
  onRemove: () => void;
}) {
  const { formatMoney } = useLocale();
  const { colors } = useTheme();
  const styles = useStyles();
  const bag = useBag();
  const toast = useToast();
  const { setSize: rememberSize } = useWishlist();
  const sizes = useMemo(() => productSizes(product, stock), [product, stock]);
  const pick = useCallback(
    (current?: string) => {
      const keep = (size?: string) => size && sizes.some((item) => item.size === size && item.stock > 0);
      return keep(current) ? current : keep(entry.size) ? entry.size : defaultSize(sizes);
    },
    [entry.size, sizes],
  );
  const [size, setSize] = useState<string | undefined>(() => pick());
  useEffect(() => {
    setSize((current) => pick(current));
  }, [pick]);

  const selected = sizes.find((item) => item.size === size);
  const soldOut = isSoldOut(sizes);
  const oneSize = isOneSize(sizes);
  const name = product.displayName || product.name;
  const href = { pathname: '/product/[code]' as const, params: { code: product.code } };
  const line = stockLine(soldOut ? 0 : (selected?.stock ?? 0));
  const lowStock = !soldOut && selected && selected.stock <= 5;

  const add = () => {
    if (!selected || selected.stock <= 0) return;
    bag.add({ id: product.id, code: product.code, size: selected.size, name, imageUrl: product.imageUrl, price: product.price, qty: 1 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toast.show(oneSize ? 'Added to bag' : `Added to bag · Size ${selected.size}`, {
      icon: 'bag-check-outline',
      action: { label: 'View bag', onPress: () => router.navigate('/(tabs)/bag') },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable
          accessibilityLabel={`Open ${name}`}
          onPress={() => router.push(href)}
          style={({ pressed }) => [styles.photo, pressed && styles.pressed]}>
          {product.imageUrl ? (
            <Image
              source={{ uri: sizedImage(product.imageUrl, IMAGE_WIDTH.card) }}
              style={[styles.fill, soldOut && styles.dim]}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : null}
        </Pressable>
        <Pressable onPress={() => router.push(href)} style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.price}>{formatMoney(product.price)}</Text>
          {soldOut || lowStock ? <Text style={[styles.stock, { color: colors[line.tone] }]}>{line.text}</Text> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from wishlist`}
          hitSlop={6}
          onPress={onRemove}
          style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
          <Ionicons name="heart" size={22} color={colors.accent} />
        </Pressable>
      </View>
      {!soldOut && !oneSize && sizes.length > 1 ? (
        <SizePicker
          sizes={sizes}
          value={size}
          onChange={(next) => {
            tapHaptic();
            setSize(next);
            rememberSize(product.code, next);
          }}
        />
      ) : null}
      <SecondaryButton label={soldOut ? 'Sold out' : 'Add to bag'} disabled={soldOut || !selected || selected.stock <= 0} onPress={add} />
    </View>
  );
}

function GoneSection({ items, onRemove, onClear }: { items: GoneItem[]; onRemove: (code: string) => void; onClear: () => void }) {
  const { colors, sectionLabel } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.gone}>
      <View style={styles.headerRow}>
        <Text style={sectionLabel}>No longer available</Text>
        <TextButton label={items.length > 1 ? 'Clear all' : 'Clear'} muted onPress={onClear} />
      </View>
      {items.map(({ entry, product }) => {
        const name = product ? product.displayName || product.name : 'Discontinued item';
        return (
          <View key={entry.code} style={styles.goneRow}>
            <View style={styles.gonePhoto}>
              {product?.imageUrl ? (
                <Image source={{ uri: sizedImage(product.imageUrl, IMAGE_WIDTH.thumb) }} style={[styles.fill, styles.dim]} contentFit="contain" cachePolicy="memory-disk" />
              ) : (
                <Ionicons name="image-outline" size={20} color={colors.muted} />
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.goneName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.goneNote}>This item has been taken off the shop.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${name} from wishlist`}
              hitSlop={6}
              onPress={() => onRemove(entry.code)}
              style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  flex: { flex: 1 },
  list: { padding: space.screen, paddingTop: 12, gap: space.gap, paddingBottom: 40 },
  skeleton: { height: 168, borderRadius: radius.card },
  emptyFooter: { paddingBottom: 40, alignItems: 'center' },
  header: { gap: 12, marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  synced: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  syncedText: { fontFamily: fonts.body, fontSize: 12, color: colors.accentText },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: colors.accentMuted,
  },
  promoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  promoText: { marginTop: 2, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    ...shadow.card,
  },
  top: { flexDirection: 'row', gap: 12 },
  photo: { width: 96, height: 96, borderRadius: 10, backgroundColor: colors.imageWell, padding: 6, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  dim: { opacity: 0.45 },
  info: { flex: 1, gap: 4, justifyContent: 'center' },
  name: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.text },
  price: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  stock: { fontFamily: fonts.bodySemi, fontSize: 12 },
  heart: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  failed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  failedText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  gone: { marginTop: 20, gap: 10 },
  goneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  gonePhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.photo,
    padding: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goneName: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted },
  goneNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
}));
