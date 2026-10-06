import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { tapHaptic } from '@/src/lib/haptics';
import { useReducedMotion } from '@/src/lib/motion';
import { useWishlist, useWishlistActions } from '@/src/lib/wishlist';
import { colors, fonts, shadow } from '@/src/theme';

function usePop() {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const pop = () => {
    if (reducedMotion) return;
    scale.setValue(0.7);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
  };
  return { scale, pop };
}

type HeartButtonProps = {
  code: string;
  /** Needed to save to the account; may be missing while the product is still loading. */
  id?: string;
  name?: string;
  /** `overlay` floats on product photos; `bar` sits in the top bar. */
  variant?: 'overlay' | 'bar';
};

export function HeartButton({ code, id, name, variant = 'bar' }: HeartButtonProps) {
  const wishlist = useWishlist();
  const { toggle } = useWishlistActions();
  const { scale, pop } = usePop();
  const saved = wishlist.has(code);
  const overlay = variant === 'overlay';

  const onPress = (event: GestureResponderEvent) => {
    // Product cards are links; keep the tap from also opening the product (web bubbles clicks).
    event.preventDefault?.();
    event.stopPropagation?.();
    if (toggle({ code, id })) pop();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: saved }}
      accessibilityLabel={saved ? `Remove ${name ?? 'item'} from wishlist` : `Save ${name ?? 'item'} to wishlist`}
      hitSlop={overlay ? 8 : 0}
      disabled={!wishlist.ready}
      onPress={onPress}
      style={({ pressed }) => [overlay ? styles.overlay : styles.bar, pressed && styles.pressed]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={overlay ? 19 : 24}
          color={saved ? colors.accent : colors.text}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Top-bar entry to the wishlist with a live count. */
export function WishlistNavButton() {
  const wishlist = useWishlist();
  const { scale, pop } = usePop();
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!wishlist.ready) return;
    if (previous.current !== null && wishlist.count > previous.current) pop();
    previous.current = wishlist.count;
  }, [wishlist.count, wishlist.ready]);

  const count = wishlist.count;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count ? `Wishlist, ${count} saved` : 'Wishlist'}
      onPress={() => {
        tapHaptic();
        router.push('/wishlist');
      }}
      style={({ pressed }) => [styles.bar, pressed && styles.pressed]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={count ? 'heart' : 'heart-outline'} size={24} color={count ? colors.accent : colors.text} />
      </Animated.View>
      {count ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: 5,
    right: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, lineHeight: 12, color: colors.onDark, fontVariant: ['tabular-nums'] },
});
