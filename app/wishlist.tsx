import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { isUnavailableStatus } from '@/src/api/client';
import { fetchProduct } from '@/src/api/product';
import { fetchStock } from '@/src/api/stock';
import type { Product, StockResponse } from '@/src/api/types';
import { SizePicker } from '@/src/components/SizePicker';
import { EmptyState, ErrorState, Screen, SecondaryButton } from '@/src/components/ui';
import { useBag } from '@/src/lib/bag';
import { formatMoney } from '@/src/lib/money';
import { defaultSize, isAvailable, isOneSize, isSoldOut, productSizes } from '@/src/lib/sizes';
import { useToast } from '@/src/lib/toast';
import { useWishlist } from '@/src/lib/wishlist';
import { colors, fonts, radius, shadow, space } from '@/src/theme';

export default function WishlistScreen() {
  const wishlist = useWishlist();
  const products = useQueries({
    queries: wishlist.codes.map((code) => ({
      queryKey: ['product', code],
      queryFn: () => fetchProduct(code),
      retry: (count: number, error: Error) => !isUnavailableStatus(error) && count < 1,
    })),
  });

  const stock = useQuery({
    queryKey: ['stock', 'wishlist', wishlist.codes.join(',')],
    queryFn: () => fetchStock(wishlist.codes),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: false,
  });
  const refetchStock = stock.refetch;
  const hasCodes = wishlist.codes.length > 0;
  useFocusEffect(
    useCallback(() => {
      if (hasCodes) void refetchStock();
    }, [hasCodes, refetchStock]),
  );

  const goneCodes = products
    .map((result, index) => {
      const code = wishlist.codes[index];
      if (isUnavailableStatus(result.error)) return code;
      if (result.data && !isAvailable(result.data, stock.data)) return code;
      return null;
    })
    .filter((code): code is string => !!code);
  const goneKey = goneCodes.join(',');
  const { drop } = wishlist;
  useEffect(() => {
    if (goneKey) goneKey.split(',').forEach(drop);
  }, [drop, goneKey]);

  const items = products
    .map((result) => result.data)
    .filter((product): product is Product => !!product && !goneCodes.includes(product.code));
  const pending = products.some((result) => result.isPending);
  const failed = products.filter((result) => result.isError && !isUnavailableStatus(result.error));

  return (
    <Screen title="Wishlist" back>
      {!wishlist.ready ? null : wishlist.codes.length === 0 ? (
        <EmptyState icon="heart-outline" message="Nothing saved yet." action="Browse shop" onPress={() => router.navigate('/(tabs)/shop')} />
      ) : pending && items.length === 0 ? (
        <View style={styles.list}>
          {wishlist.codes.slice(0, 6).map((code) => (
            <View key={code} style={styles.skeleton} />
          ))}
        </View>
      ) : items.length === 0 && failed.length > 0 ? (
        <ErrorState message="Can't load the shop" onRetry={() => failed.forEach((result) => result.refetch())} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(product) => product.code}
          contentContainerStyle={styles.list}
          refreshing={stock.isFetching}
          onRefresh={() => stock.refetch()}
          renderItem={({ item: product }) => (
            <WishlistItem product={product} stock={stock.data} onRemove={() => wishlist.drop(product.code)} />
          )}
        />
      )}
    </Screen>
  );
}

function WishlistItem({ product, stock, onRemove }: { product: Product; stock?: StockResponse; onRemove: () => void }) {
  const bag = useBag();
  const toast = useToast();
  const sizes = useMemo(() => productSizes(product, stock), [product, stock]);
  const [size, setSize] = useState<string | undefined>(defaultSize(sizes));
  useEffect(() => {
    setSize((current) => (current && sizes.some((item) => item.size === current) ? current : defaultSize(sizes)));
  }, [sizes]);

  const selected = sizes.find((item) => item.size === size);
  const soldOut = isSoldOut(sizes);
  const name = product.displayName || product.name;
  const href = { pathname: '/product/[code]' as const, params: { code: product.code } };

  const add = () => {
    if (!selected || selected.stock <= 0) return;
    bag.add({ code: product.code, size: selected.size, name, imageUrl: product.imageUrl, price: product.price, qty: 1 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toast.show('Added to bag');
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable onPress={() => router.push(href)} style={({ pressed }) => [styles.photo, pressed && styles.pressed]}>
          {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.fill} contentFit="contain" cachePolicy="disk" /> : null}
        </Pressable>
        <Pressable onPress={() => router.push(href)} style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.price}>{formatMoney(product.price)}</Text>
          {soldOut ? <Text style={styles.sold}>Sold out</Text> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove from wishlist"
          onPress={onRemove}
          style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
          <Ionicons name="heart" size={22} color={colors.accent} />
        </Pressable>
      </View>
      {!soldOut && !isOneSize(sizes) && sizes.length > 1 ? <SizePicker sizes={sizes} value={size} onChange={setSize} /> : null}
      <SecondaryButton
        label={soldOut ? 'Sold out' : 'Add to bag'}
        disabled={soldOut || !selected || selected.stock <= 0}
        onPress={add}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.screen, gap: space.gap },
  skeleton: { height: 160, borderRadius: radius.card, backgroundColor: colors.surface },
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
  photo: { width: 88, height: 88, borderRadius: 10, backgroundColor: colors.imageWell, padding: 6, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 19, color: colors.text },
  price: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accentText, fontVariant: ['tabular-nums'] },
  sold: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
  heart: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
});
