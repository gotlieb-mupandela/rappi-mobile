import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { EmptyState, PrimaryButton, Screen, SkeletonList } from '@/src/components/ui';
import { QtyStepper } from '@/src/components/QtyStepper';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';
import { formatMoney } from '@/src/lib/money';
import { openLogin } from '@/src/lib/navigation';
import { colors, fonts, radius, shadow, space } from '@/src/theme';

export default function BagScreen() {
  const { lines, ready, subtotal, setQty, remove } = useBag();
  const { session } = useAuth();

  const checkout = () => {
    if (!session) {
      openLogin('/checkout');
      return;
    }
    router.push('/checkout');
  };

  return (
    <Screen title="Bag">
      {!ready ? (
        <SkeletonList count={4} />
      ) : lines.length === 0 ? (
        <EmptyState message="Your bag is empty." action="Browse shop" onPress={() => router.navigate('/(tabs)/shop')} />
      ) : (
        <View style={styles.flex}>
          <FlatList
            data={lines}
            keyExtractor={(line) => `${line.code}-${line.size}`}
            contentContainerStyle={styles.list}
            renderItem={({ item: line }) => (
              <Swipeable
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${line.name} from bag`}
                    style={styles.delete}
                    onPress={() => remove(line.code, line.size)}>
                    <Text style={styles.deleteText}>Remove</Text>
                  </Pressable>
                )}>
                <View style={styles.card}>
                  <View style={styles.photo}>
                    {line.imageUrl ? <Image source={{ uri: line.imageUrl }} style={styles.fill} contentFit="contain" transition={150} /> : null}
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.name} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={styles.meta}>{line.size}</Text>
                    <Text style={styles.total}>{formatMoney(line.price * line.qty)}</Text>
                    <QtyStepper value={line.qty} onChange={(qty) => setQty(line.code, line.size, qty)} />
                  </View>
                </View>
              </Swipeable>
            )}
          />
          <View style={styles.footer}>
            <View style={styles.subRow}>
              <Text style={styles.subLabel}>Subtotal</Text>
              <Text style={styles.subValue}>{formatMoney(subtotal)}</Text>
            </View>
            <PrimaryButton label="Check out" onPress={checkout} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  delete: { backgroundColor: colors.danger, justifyContent: 'center', paddingHorizontal: 16, marginLeft: 8, borderRadius: radius.card },
  deleteText: { color: colors.onDark, fontFamily: fonts.bodySemi },
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
});
