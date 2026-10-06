import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pressHaptic, tapHaptic } from '@/src/lib/haptics';
import { IMAGE_WIDTH, sizedImage } from '@/src/lib/images';
import { OfflineBanner } from '@/src/lib/offline';
import { useReducedMotion } from '@/src/lib/motion';
import { buttonLabel, colors, fonts, radius, space } from '@/src/theme';

type TopBarProps = {
  title?: string;
  wordmark?: boolean;
  back?: boolean;
  right?: React.ReactNode;
};

export function TopBar({ title, wordmark, back, right }: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top }]}>
      <View style={styles.topInner}>
        {wordmark ? null : (
          <View style={styles.topSide}>
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        )}
        {wordmark ? (
          <View style={styles.wordmark}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel="Rappi Sports Hub"
            />
          </View>
        ) : (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
        <View style={[styles.topSide, styles.topRight]}>{right}</View>
      </View>
    </View>
  );
}

export function Screen({
  title,
  wordmark,
  back,
  right,
  children,
  banner = true,
}: TopBarProps & { children: React.ReactNode; banner?: boolean }) {
  return (
    <View style={styles.screen}>
      <TopBar title={title} wordmark={wordmark} back={back} right={right} />
      {banner ? <OfflineBanner /> : null}
      {children}
    </View>
  );
}

export function PathTrail({ parts }: { parts: { label: string; onPress?: () => void }[] }) {
  return (
    <View style={styles.path}>
      {parts.map((part, index) => (
        <View key={`${part.label}-${index}`} style={styles.pathRow}>
          {index > 0 ? <Text style={styles.pathSep}> › </Text> : null}
          <Pressable disabled={!part.onPress} onPress={part.onPress}>
            <Text style={[styles.pathText, index === parts.length - 1 && styles.pathCurrent]}>{part.label}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/** Pressable with a subtle spring scale; honours reduced motion. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, children, ...rest }: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (to: number) => {
    if (reducedMotion) return;
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        animate(scaleTo);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}>
      {(state) => (
        <Animated.View style={[style, { transform: [{ scale }] }, state.pressed && !disabled && styles.pressedSoft]}>
          {typeof children === 'function' ? children(state) : children}
        </Animated.View>
      )}
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        pressHaptic();
        onPress?.();
      }}
      style={[styles.primary, disabled && styles.disabled]}>
      <Text style={styles.primaryLabel}>{label}</Text>
    </PressableScale>
  );
}

export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tapHaptic();
        onPress?.();
      }}
      style={[styles.secondary, disabled && styles.disabled]}>
      <Text style={styles.secondaryLabel}>{label}</Text>
    </PressableScale>
  );
}

export function TextButton({
  label,
  onPress,
  muted,
}: {
  label: string;
  onPress?: () => void;
  muted?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
      <Text style={[styles.textButtonLabel, muted && styles.textButtonMuted]}>{label}</Text>
    </Pressable>
  );
}

export function FormScroll({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.form, { gap }]}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      selectionColor={colors.accent}
      cursorColor={colors.accent}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function LabeledField({
  label,
  optional,
  ...props
}: TextInputProps & { label: string; optional?: boolean }) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional ? <Text style={styles.fieldOptional}>Optional</Text> : null}
      </View>
      <Field accessibilityLabel={label} {...props} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function BrandMark({ height = 96 }: { height?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={{ height, aspectRatio: 593 / 360, alignSelf: 'center' }}
      contentFit="contain"
      accessibilityLabel="Rappi Sports Hub"
    />
  );
}

export function FolderCard({
  name,
  imageUrl,
  onPress,
}: {
  name: string;
  imageUrl?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => {
        tapHaptic();
        onPress();
      }}
      style={styles.folder}>
      <View style={styles.folderImage}>
        {imageUrl ? (
          <Image source={{ uri: sizedImage(imageUrl, IMAGE_WIDTH.card) }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={180} />
        ) : null}
      </View>
      <Text style={styles.folderName} numberOfLines={2}>
        {name}
      </Text>
    </PressableScale>
  );
}

/** Rounded category card for hub pages: square photo with the name underneath. */
export function TypeCard({ name, imageUrl, onPress }: { name: string; imageUrl?: string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => {
        tapHaptic();
        onPress();
      }}>
      <View style={styles.typeImage}>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={180} /> : null}
      </View>
      <View style={styles.typeRow}>
        <Text style={styles.typeName} numberOfLines={1}>
          {name}
        </Text>
        <Ionicons name="arrow-forward" size={14} color={colors.muted} />
      </View>
    </PressableScale>
  );
}

export function ListCard({
  title,
  subtitle,
  danger,
  disabled,
  onPress,
}: {
  title: string;
  subtitle?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      scaleTo={0.985}
      onPress={() => {
        tapHaptic();
        onPress?.();
      }}
      style={[styles.listCard, disabled && styles.disabled]}>
      <View style={styles.flex}>
        <Text style={[styles.listTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.listSub}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={danger ? colors.danger : colors.text} />
    </PressableScale>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function EmptyState({
  message,
  action,
  onPress,
  icon = 'bag-handle-outline',
}: {
  message: string;
  action?: string;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.text} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
      {action ? <PrimaryButton label={action} onPress={onPress} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.text} />
      </View>
      <Text style={styles.emptyTitle}>{message}</Text>
      <Text style={styles.emptyText}>Check your connection and try again.</Text>
      <SecondaryButton label="Try again" onPress={onRetry} />
    </View>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.skelGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} style={styles.skelCard} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.skelList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock key={index} style={styles.skelRow} />
      ))}
    </View>
  );
}

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(0.72);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.36, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.72, duration: 700, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return <Animated.View accessibilityElementsHidden style={[styles.skeleton, style, { opacity }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topInner: {
    height: space.topBar,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  topSide: { width: 56, alignItems: 'flex-start' },
  topRight: { alignItems: 'flex-end' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  logo: {
    height: 44,
    aspectRatio: 593 / 360,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.text,
  },
  path: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: space.screen,
    paddingTop: 10,
    paddingBottom: 4,
  },
  pathRow: { flexDirection: 'row', alignItems: 'center' },
  pathSep: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  pathText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  pathCurrent: { color: colors.text },
  primary: {
    height: 54,
    paddingHorizontal: 32,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { ...buttonLabel, color: colors.onAccent },
  secondary: {
    height: 54,
    paddingHorizontal: 32,
    borderRadius: radius.chip,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { ...buttonLabel, color: colors.text },
  textButton: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accentText },
  textButtonMuted: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  pressedSoft: { opacity: 0.92 },
  input: {
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  fieldGroup: { gap: 7 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  fieldOptional: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.text },
  chipLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  chipLabelSelected: { fontFamily: fonts.bodySemi, color: colors.onDark },
  folder: { backgroundColor: colors.bg },
  folderImage: { aspectRatio: 0.75, backgroundColor: colors.imageWell, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
  folderName: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 4,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.text,
  },
  typeImage: { aspectRatio: 1, borderRadius: radius.card, backgroundColor: colors.imageWell, overflow: 'hidden' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 10, paddingHorizontal: 2 },
  typeName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  listCard: {
    minHeight: 68,
    borderRadius: radius.card,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  listSub: { marginTop: 2, fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  flex: { flex: 1 },
  form: { padding: space.screen, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  skelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap, padding: space.screen },
  skelCard: {
    width: '47.5%',
    flexGrow: 1,
    aspectRatio: 0.7,
    borderRadius: radius.card,
  },
  skelList: { padding: space.screen, gap: 10 },
  skelRow: { height: 68, borderRadius: radius.card },
  skeleton: { backgroundColor: '#eeeeee' },
});
