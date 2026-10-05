import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, Screen } from '@/src/components/ui';
import { useAuth } from '@/src/lib/auth';
import { formatMoney } from '@/src/lib/money';
import { openLogin } from '@/src/lib/navigation';
import { fetchOrders, formatOrderDate, orderStatusLabel, shortOrderId } from '@/src/lib/orders';
import { colors, fonts, radius, shadow, space } from '@/src/theme';

export default function OrdersScreen() {
  const { session } = useAuth();
  const orders = useQuery({
    queryKey: ['orders', session?.user.id],
    enabled: !!session,
    queryFn: fetchOrders,
    staleTime: 0,
  });

  return (
    <Screen title="Orders" back>
      {!session ? (
        <EmptyState message="Sign in to see orders." action="Sign in" onPress={() => openLogin('/orders')} />
      ) : orders.isPending ? (
        <View style={styles.list}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeleton} />
          ))}
        </View>
      ) : orders.isError && !orders.data ? (
        <ErrorState message="Can't load your orders" onRetry={() => orders.refetch()} />
      ) : orders.data && orders.data.length === 0 ? (
        <EmptyState icon="receipt-outline" message="No orders yet." action="Browse shop" onPress={() => router.navigate('/(tabs)/shop')} />
      ) : (
        <FlatList
          data={orders.data ?? []}
          keyExtractor={(order) => order.id}
          contentContainerStyle={styles.list}
          refreshing={orders.isRefetching}
          onRefresh={() => orders.refetch()}
          renderItem={({ item: order }) => {
            const label = orderStatusLabel(order.status);
            return (
              <Pressable
                key={order.id}
                onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <View style={styles.left}>
                  <Text style={styles.date}>{formatOrderDate(order.created_at)}</Text>
                  <Text style={styles.id}>#{shortOrderId(order.id)}</Text>
                </View>
                {label ? <Text style={styles.status}>{label}</Text> : <View />}
                <Text style={styles.total}>{formatMoney(order.total)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.screen, gap: 8 },
  skeleton: { height: 64, borderRadius: radius.card, backgroundColor: colors.surface },
  card: {
    minHeight: 64,
    borderRadius: radius.card,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...shadow.card,
  },
  pressed: { opacity: 0.85 },
  left: { flex: 1 },
  date: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  id: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  status: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accentText },
  total: { minWidth: 72, textAlign: 'right', fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
});
