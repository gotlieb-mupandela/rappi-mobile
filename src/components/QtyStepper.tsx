import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/src/theme';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function QtyStepper({ value, min = 1, max = 99, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, value <= min && styles.disabled]}>
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, value >= max && styles.disabled]}>
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    color: colors.text,
  },
  value: {
    minWidth: 20,
    textAlign: 'center',
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
