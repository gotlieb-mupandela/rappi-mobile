import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/src/lib/motion';
import { colors, fonts, radius, shadow, space } from '@/src/theme';

type ToastOptions = {
  icon?: ComponentProps<typeof Ionicons>['name'];
  action?: { label: string; onPress: () => void };
};

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
};

type ToastMessage = ToastOptions & { text: string };

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setMessage(null);
    });
  }, [progress]);

  const show = useCallback(
    (text: string, options?: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage({ text, ...options });
      AccessibilityInfo.announceForAccessibility(text);
      if (reducedMotion) {
        progress.setValue(1);
      } else {
        Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
      }
      // Toasts with an action stay up longer so there's time to reach for it.
      timer.current = setTimeout(hide, options?.action ? 3500 : 2000);
    },
    [hide, progress, reducedMotion],
  );

  const value = useMemo(() => ({ show }), [show]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View
          style={[
            styles.toast,
            !message.action && styles.plain,
            { top: insets.top + space.topBar + 8, opacity: progress, transform: [{ translateY }] },
          ]}>
          {message.icon ? <Ionicons name={message.icon} size={18} color={message.icon === 'heart' ? colors.accent : colors.onDark} /> : null}
          <Text style={styles.text} numberOfLines={2}>
            {message.text}
          </Text>
          {message.action ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                message.action?.onPress();
                hide();
              }}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <Text style={styles.actionLabel}>{message.action.label}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.screen,
    right: space.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.text,
    borderRadius: radius.card,
    paddingLeft: 16,
    paddingRight: 8,
    minHeight: 52,
    zIndex: 50,
    ...shadow.card,
  },
  plain: { paddingRight: 16 },
  text: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.onDark,
  },
  action: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },
  actionLabel: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.accentBright,
  },
  pressed: { opacity: 0.7 },
});
