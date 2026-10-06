import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { useAuth } from '@/src/lib/auth';
import { openLogin } from '@/src/lib/navigation';
import { fetchOrder, formatOrderDate, orderStatusLabel, shippingLabel, shortOrderId } from '@/src/lib/orders';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius, space } from '@/src/theme';

export default function OrderDetailScreen() {
  const { formatMoney, intlLocale, market, t } = useLocale();
  const { colors, sectionLabel } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, ready } = useAuth();
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrder(id),
    enabled: !!session && !!id,
    staleTime: 0,
  });

  const data = order.data;
  const language = market === 'eu' ? 'fr' : 'en';
  const label = data ? orderStatusLabel(data.status, language) : null;

  return (
    <Screen title={t('orders.order')} back>
      {ready && !session ? (
        <EmptyState message="Sign in to see this order." action="Sign in" onPress={() => openLogin(`/orders/${id}`)} />
      ) : order.isPending ? (
        <View style={styles.content}>
          <View style={[styles.skeleton, { height: 120 }]} />
          <View style={[styles.skeleton, { height: 100 }]} />
        </View>
      ) : order.isError ? (
        <ErrorState message="Can't load this order" onRetry={() => order.refetch()} />
      ) : !data ? (
        <EmptyState message="Order not found." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => order.refetch()} tintColor={colors.accent} />}>
          <View style={styles.head}>
            <View>
              <Text style={styles.date}>{formatOrderDate(data.created_at, intlLocale)}</Text>
              <Text style={styles.meta}>#{shortOrderId(data.id)}</Text>
            </View>
            {label ? <Text style={styles.status}>{label}</Text> : null}
          </View>

          <Text style={[sectionLabel, styles.block]}>{t('orders.items').toUpperCase()}</Text>
          <View style={styles.card}>
            {(data.order_items ?? []).map((item, index) => (
              <View key={`${item.code}-${item.size}-${index}`} style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.dim}>
                    Size {item.size} · Qty {item.qty}
                  </Text>
                </View>
                <Text style={styles.price}>{formatMoney(item.unit_price * item.qty)}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <Line label={t('bag.subtotal')} value={formatMoney(data.subtotal)} />
            <Line label={t('checkout.shipping')} value={formatMoney(data.shipping_cost)} />
            <Line label={t('checkout.vat', { rate: Math.round((data.vat_rate > 1 ? data.vat_rate : data.vat_rate * 100) || 15) })} value={formatMoney(data.vat_amount)} />
            <Line label={t('checkout.total')} value={formatMoney(data.total)} bold />
          </View>

          <Text style={[sectionLabel, styles.block]}>{t('orders.delivery').toUpperCase()}</Text>
          <View style={styles.card}>
            <Text style={styles.name}>{data.full_name}</Text>
            <Text style={styles.dim}>{shippingLabel(data.shipping_method, language)}</Text>
            {data.shipping_method !== 'pickup' ? (
              <>
                <Text style={styles.dim}>{data.address}</Text>
                <Text style={styles.dim}>
                  {data.city}, {data.country}
                </Text>
              </>
            ) : null}
            {data.phone ? <Text style={styles.dim}>{data.phone}</Text> : null}
            {data.notes ? <Text style={styles.dim}>{data.notes}</Text> : null}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.lineValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  content: { padding: space.screen, gap: 8, paddingBottom: 40 },
  skeleton: { borderRadius: radius.card, backgroundColor: colors.surface },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.text },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  status: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accentText },
  block: { marginTop: 16 },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    ...shadow.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  dim: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  price: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLabel: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  lineValue: { fontFamily: fonts.body, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  bold: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
}));
