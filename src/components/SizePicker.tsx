import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProductSize } from '@/src/api/types';
import { colors, fonts, radius } from '@/src/theme';

type Props = {
  sizes: ProductSize[];
  value?: string;
  onChange: (size: string) => void;
};

export function SizePicker({ sizes, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {sizes.map((item) => {
        const soldOut = item.stock === 0;
        const selected = value === item.size;
        return (
          <Pressable
            key={item.size}
            disabled={soldOut}
            onPress={() => onChange(item.size)}
            style={({ pressed }) => [
              styles.chip,
              selected && styles.selected,
              soldOut && styles.sold,
              pressed && !soldOut && styles.pressed,
            ]}>
            <Text style={[styles.label, selected && styles.selectedLabel, soldOut && styles.soldLabel]}>{item.size}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: colors.accentMuted,
  },
  sold: {
    opacity: 0.6,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
  },
  selectedLabel: {
    fontFamily: fonts.bodyBold,
    color: colors.accentText,
  },
  soldLabel: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  pressed: { opacity: 0.85 },
});
