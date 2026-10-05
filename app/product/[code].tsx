import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isUnavailableStatus } from '@/src/api/client';
import { fetchProduct } from '@/src/api/product';
import { fetchStock } from '@/src/api/stock';
import { QtyStepper } from '@/src/components/QtyStepper';
import { SizePicker } from '@/src/components/SizePicker';
import { EmptyState, ErrorState, PrimaryButton, Screen } from '@/src/components/ui';
import { useBag } from '@/src/lib/bag';
import { categoryName } from '@/src/lib/categories';
import { formatMoney } from '@/src/lib/money';
import { defaultSize, isAvailable, isOneSize, isPack, isSoldOut, productSizes, stockLine } from '@/src/lib/sizes';
import { useToast } from '@/src/lib/toast';
import { useWishlist } from '@/src/lib/wishlist';
import { colors, fonts, space } from '@/src/theme';

export default function ProductScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = useMemo(() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [raw]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const bag = useBag();
  const wishlist = useWishlist();
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState<string>();
  const [qty, setQty] = useState(1);

  const product = useQuery({
    queryKey: ['product', code],
    queryFn: () => fetchProduct(code),
    retry: (count, error) => !isUnavailableStatus(error) && count < 1,
  });

  const stock = useQuery({
    queryKey: ['stock', code],
    queryFn: () => fetchStock([code]),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: false,
  });
  const refetchStock = stock.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchStock();
    }, [refetchStock]),
  );

  const gone = isUnavailableStatus(product.error) || (product.data != null && !isAvailable(product.data, stock.data));
  const { drop } = wishlist;
  useEffect(() => {
    if (gone) drop(code);
  }, [code, drop, gone]);

  const sizes = useMemo(() => (product.data ? productSizes(product.data, stock.data) : []), [product.data, stock.data]);
  const oneSize = isOneSize(sizes);

  useEffect(() => {
    setSize((current) => (current && sizes.some((item) => item.size === current) ? current : defaultSize(sizes)));
  }, [sizes]);

  const selected = sizes.find((item) => item.size === size);
  const soldOut = isSoldOut(sizes);
  const stockCount = selected ? selected.stock : sizes.reduce((sum, item) => sum + Math.max(0, item.stock), 0);
  const maxQty = Math.max(1, Math.min(99, selected?.stock ?? 99));

  useEffect(() => {
    setQty((current) => Math.min(current, maxQty));
  }, [maxQty]);

  const images = useMemo(() => {
    const list = [...new Set(product.data?.images?.filter(Boolean) ?? [])];
    if (list.length > 0) return list;
    return product.data?.imageUrl ? [product.data.imageUrl] : [];
  }, [product.data]);

  const canAdd = !!product.data && !gone && !soldOut && !!selected && selected.stock > 0;

  const add = () => {
    if (!product.data || !selected || !canAdd) return;
    bag.add({
      code: product.data.code,
      size: selected.size,
      name: product.data.displayName || product.data.name,
      imageUrl: product.data.imageUrl,
      price: product.data.price,
      qty,
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toast.show('Added to bag');
  };

  const line = stockLine(soldOut ? 0 : stockCount);
  const pack = product.data ? isPack(product.data) : false;
  const saved = wishlist.has(code);

  return (
    <Screen
      title={product.data ? categoryName(product.data.category) : 'Product'}
      back
      right={
        gone ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            onPress={() => wishlist.toggle(code)}
            style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={24} color={saved ? colors.accent : colors.text} />
          </Pressable>
        )
      }>
      {gone ? (
        <EmptyState message="This product is no longer available." />
      ) : product.isError ? (
        <ErrorState message="Can't load the shop" onRetry={() => product.refetch()} />
      ) : product.isPending ? (
        <View>
          <View style={[styles.skelImage, { width, height: width }]} />
          <View style={styles.skelLine} />
          <View style={[styles.skelLine, styles.skelShort]} />
        </View>
      ) : product.data ? (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.gallery}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
                }}>
                {images.length > 0 ? (
                  images.map((uri) => (
                    <Image key={uri} source={{ uri }} style={{ width, height: width }} contentFit="contain" cachePolicy="disk" transition={200} />
                  ))
                ) : (
                  <View style={{ width, height: width }} />
                )}
              </ScrollView>
              {images.length > 1 ? (
                <View style={styles.dots}>
                  {images.map((uri, i) => (
                    <View key={uri} style={[styles.dot, i === index && styles.dotOn]} />
                  ))}
                </View>
              ) : null}
            </View>
            <Text style={styles.eyebrow}>{categoryName(product.data.category)}</Text>
            <Text style={styles.title}>
              {product.data.displayName || product.data.name}
              {pack ? ' · Pack' : ''}
            </Text>
            <Text style={styles.price}>{formatMoney(product.data.price)}</Text>
            {pack ? <Text style={styles.note}>Sold as a pack. Sizes inside may be mixed.</Text> : null}
            {product.data.packSize ? <Text style={styles.note}>Pack of {product.data.packSize}</Text> : null}
            {!oneSize && sizes.length > 0 ? (
              <View style={styles.sizeBlock}>
                <Text style={styles.sizeLabel}>SIZE</Text>
                <SizePicker sizes={sizes} value={size} onChange={setSize} />
              </View>
            ) : null}
            <Text style={[styles.stock, { color: line.color }]}>{line.text}</Text>
            {product.data.description ? <Text style={styles.desc}>{product.data.description}</Text> : null}
          </ScrollView>
          <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {!soldOut ? <QtyStepper value={qty} max={maxQty} onChange={setQty} /> : null}
            <View style={styles.grow}>
              <PrimaryButton label={soldOut ? 'Sold out' : 'Add to bag'} disabled={!canAdd} onPress={add} />
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heart: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  body: { paddingBottom: 24 },
  gallery: { backgroundColor: colors.imageWell },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.18)' },
  dotOn: { backgroundColor: colors.accent },
  eyebrow: {
    marginTop: 16,
    paddingHorizontal: space.screen,
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.accentText,
  },
  title: {
    paddingHorizontal: space.screen,
    marginTop: 6,
    fontFamily: fonts.bodySemi,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
  },
  price: {
    paddingHorizontal: space.screen,
    marginTop: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: colors.accentText,
    fontVariant: ['tabular-nums'],
  },
  note: { paddingHorizontal: space.screen, marginTop: 8, fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  sizeBlock: { paddingHorizontal: space.screen, marginTop: 20 },
  sizeLabel: {
    marginBottom: 8,
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 0.6,
    color: colors.muted,
  },
  stock: { paddingHorizontal: space.screen, marginTop: 12, fontFamily: fonts.body, fontSize: 13 },
  desc: { paddingHorizontal: space.screen, marginTop: 16, fontFamily: fonts.body, fontSize: 15, color: colors.text, lineHeight: 22 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.screen,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  grow: { flex: 1 },
  skelImage: { backgroundColor: colors.surface },
  skelLine: { height: 18, marginTop: 16, marginHorizontal: space.screen, borderRadius: 6, backgroundColor: colors.surface },
  skelShort: { width: '40%' },
});
