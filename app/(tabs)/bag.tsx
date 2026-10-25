import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { EmptyState, PrimaryButton, Screen, SecondaryButton, SkeletonList } from '@/src/components/ui';
import { QtyStepper } from '@/src/components/QtyStepper';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';
import { SERVER_QUOTE_CHECKOUT } from '@/src/lib/flags';
import { IMAGE_WIDTH, sizedImage } from '@/src/lib/images';
import { openLogin } from '@/src/lib/navigation';
import { formatQuotedAmount, plainText, pricedItemFor, quoteFailureText } from '@/src/lib/serverQuote';
import { useCartPrices } from '@/src/lib/useServerQuote';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius, space } from '@/src/theme';

export default function BagScreen() {
  const { formatMoney, t } = useLocale();
  const { colors } = useTheme();
  const styles = useStyles();
  const { lines, ready, synced, subtotal, setQty, remove, refresh } = useBag();
  const { session } = useAuth();
  const showServerPrices = SERVER_QUOTE_CHECKOUT && !!session;
  const serverPrices = useCartPrices(
    lines.map((line) => ({ code: line.code, size: line.size, qty: line.qty })),
    showServerPrices && lines.length > 0,
  );
  const priced =
    showServerPrices && serverPrices.status === 'ready' && serverPrices.data && serverPrices.inputKey === serverPrices.requestKey
      ? serverPrices.data
      : null;
  const priceFocus = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (synced) void refresh();
      if (!showServerPrices) return;
      if (priceFocus.current) serverPrices.retry();
      priceFocus.current = true;
    }, [refresh, serverPrices.retry, showServerPrices, synced]),
  );

  const checkout = () => {
    if (!session) {
      openLogin('/checkout');
      return;
    }
    router.push('/checkout');
  };

  return (
    <Screen title={t('bag.title')}>
      {!ready ? (
        <SkeletonList count={4} />
      ) : lines.length === 0 ? (
        <EmptyState message={t('bag.empty')} action={t('bag.browse')} onPress={() => router.navigate('/(tabs)/shop')} />
      ) : (
        <View style={styles.flex}>
          <FlatList
            data={lines}
            keyExtractor={(line) => `${line.code}-${line.size}`}
            contentContainerStyle={styles.list}
            renderItem={({ item: line }) => {
              const serverItem = priced ? pricedItemFor(priced, line.code, line.size) : null;
              const quotedTotal =
                showServerPrices
                  ? serverItem && priced
                    ? formatQuotedAmount(serverItem.lineTotal, priced.currency)
                    : ''
                  : formatMoney(line.price * line.qty);
              return (
              <Swipeable
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('bag.remove', { name: line.name })}
                    style={styles.deleteWrap}
                    onPress={() => remove(line.code, line.size)}>
                    {({ pressed }) => (
                      <View style={[styles.delete, pressed && styles.deletePressed]}>
                        <Ionicons name="trash-outline" size={20} color={colors.onDark} />
                      </View>
                    )}
                  </Pressable>
                )}>
                <View style={styles.card}>
                  <View style={styles.photo}>
                    {line.imageUrl ? (
                      <Image
                        source={{ uri: sizedImage(line.imageUrl, IMAGE_WIDTH.thumb) }}
                        style={styles.fill}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={150}
                      />
                    ) : null}
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={styles.meta}>{line.size}</Text>
                    {serverItem && priced ? (
                      <Text style={styles.meta}>{t('bag.each', { price: formatQuotedAmount(serverItem.unitPrice, priced.currency) })}</Text>
                    ) : null}
                    <Text style={styles.total}>{quotedTotal}</Text>
                    <QtyStepper value={line.qty} onChange={(qty) => setQty(line.code, line.size, qty)} />
                  </View>
                </View>
              </Swipeable>
              );
            }}
          />
          <View style={styles.footer}>
            {showServerPrices && serverPrices.status === 'error' && serverPrices.failureCode && serverPrices.inputKey === serverPrices.requestKey ? (
              <View style={styles.quoteError}>
                <Text style={styles.error}>{plainText(quoteFailureText(serverPrices.failureCode))}</Text>
                <SecondaryButton label={t('common.retry')} onPress={serverPrices.retry} />
              </View>
            ) : (
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>{t('bag.subtotal')}</Text>
                <Text style={styles.subValue}>
                  {showServerPrices
                    ? priced
                      ? formatQuotedAmount(priced.subtotal, priced.currency)
                      : t('bag.pricesLoading')
                    : formatMoney(subtotal)}
                </Text>
              </View>
            )}
            <PrimaryButton label={t('bag.checkout')} onPress={checkout} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  flex: { flex: 1 },
  list: { padding: space.screen, gap: space.gap, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 12,
    ...shadow.card,
  },
  photo: { width: 72, height: 72, backgroundColor: colors.imageWell, borderRadius: 10, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  body: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  total: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.accentText, fontVariant: ['tabular-nums'] },
  deleteWrap: { justifyContent: 'center', paddingLeft: 10 },
  delete: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deletePressed: { opacity: 0.85 },
  footer: {
    padding: space.screen,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: 12,
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  subValue: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  quoteError: { gap: 8 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger },
}));
