import { ActivityIndicator, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import type { ShippingMethod } from '../../api/types.ts';

export type CheckoutShippingRowView = {
  id: ShippingMethod;
  label: string;
  costLabel: string;
  selected: boolean;
};

type ShippingStyles = {
  pending: StyleProp<ViewStyle>;
  pendingBody: StyleProp<TextStyle>;
  ship: StyleProp<ViewStyle>;
  shipOn: StyleProp<ViewStyle>;
  pressed: StyleProp<ViewStyle>;
  shipCopy: StyleProp<ViewStyle>;
  radio: StyleProp<ViewStyle>;
  radioOn: StyleProp<ViewStyle>;
  radioDot: StyleProp<ViewStyle>;
  shipLabel: StyleProp<TextStyle>;
  shipCost: StyleProp<TextStyle>;
};

function RetryButton({
  retrying,
  retryLabel,
  onRetry,
}: {
  retrying: boolean;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={retryLabel}
      accessibilityState={{ disabled: retrying, busy: retrying }}
      disabled={retrying}
      onPress={() => {
        if (retrying) return;
        onRetry();
      }}
      style={retrying ? { opacity: 0.4 } : undefined}>
      {retrying ? <ActivityIndicator accessibilityLabel={retryLabel} /> : null}
      <Text>{retryLabel}</Text>
    </Pressable>
  );
}

export function CheckoutShippingState({
  loading,
  unavailable,
  unsupported = false,
  retrying = false,
  loadingText,
  unavailableText,
  unsupportedText = '',
  chooseText = null,
  retryLabel,
  onRetry,
  rows,
  onSelect,
  styles,
}: {
  loading: boolean;
  unavailable: boolean;
  /** Feed returned shipping rows this app version cannot pay with. */
  unsupported?: boolean;
  /** True while Retry has already been shown and a reload is in flight. */
  retrying?: boolean;
  loadingText: string;
  unavailableText: string;
  unsupportedText?: string;
  /** Shown when rows exist and none is selected. */
  chooseText?: string | null;
  retryLabel: string;
  onRetry: () => void;
  rows: CheckoutShippingRowView[];
  onSelect: (id: ShippingMethod) => void;
  styles: ShippingStyles;
}) {
  if (loading) {
    return (
      <View style={styles.pending} testID="checkout-shipping-loading">
        <ActivityIndicator accessibilityLabel={loadingText} />
        <Text style={styles.pendingBody}>{loadingText}</Text>
        {retrying ? <RetryButton retrying retryLabel={retryLabel} onRetry={onRetry} /> : null}
      </View>
    );
  }
  if (unsupported) {
    return (
      <View style={styles.pending} testID="checkout-shipping-unsupported">
        <Text style={styles.pendingBody}>{unsupportedText}</Text>
      </View>
    );
  }
  if (unavailable) {
    return (
      <View style={styles.pending} testID="checkout-shipping-unavailable">
        <Text style={styles.pendingBody}>{unavailableText}</Text>
        <RetryButton retrying={retrying} retryLabel={retryLabel} onRetry={onRetry} />
      </View>
    );
  }
  return (
    <>
      {chooseText ? (
        <Text style={styles.pendingBody} testID="checkout-choose-shipping">
          {chooseText}
        </Text>
      ) : null}
      {rows.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: item.selected }}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => [styles.ship, item.selected && styles.shipOn, pressed && styles.pressed]}>
          <View style={styles.shipCopy}>
            <View style={[styles.radio, item.selected && styles.radioOn]}>{item.selected ? <View style={styles.radioDot} /> : null}</View>
            <Text style={styles.shipLabel}>{item.label}</Text>
          </View>
          <Text style={styles.shipCost}>{item.costLabel}</Text>
        </Pressable>
      ))}
    </>
  );
}

export function CheckoutTotalsNote({
  note,
  vatHidden,
  style,
}: {
  note: string;
  vatHidden: string | null;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={style} testID="checkout-totals-note">
      {note}
      {vatHidden ? ` ${vatHidden}` : ''}
    </Text>
  );
}
