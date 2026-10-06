import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/src/i18n/LocaleProvider';
import { tapHaptic } from '@/src/lib/haptics';
import { initials } from '@/src/lib/profile';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius, space } from '@/src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function SettingsGroup({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const styles = useStyles();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

function RowIcon({ icon, danger }: { icon: IconName; danger?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.icon, danger && styles.iconDanger]}>
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.text} />
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  detail,
  value,
  danger,
  external,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  value?: string;
  danger?: boolean;
  external?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={external ? 'link' : 'button'}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={detail}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={() => {
        tapHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.disabled]}>
      <RowIcon icon={icon} danger={danger} />
      <View style={styles.rowText}>
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {onPress ? (
        <Ionicons
          name={external ? 'open-outline' : 'chevron-forward'}
          size={external ? 16 : 18}
          color={danger ? colors.danger : colors.muted}
        />
      ) : null}
    </Pressable>
  );
}

export function SettingsSwitchRow({
  icon,
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.disabled]}>
      <RowIcon icon={icon} />
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.handle, true: colors.accent }}
        thumbColor={colors.bg}
        ios_backgroundColor={colors.handle}
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}

export function Avatar({ uri, name, email, size = 72 }: { uri?: string; name: string; email?: string | null; size?: number }) {
  const styles = useStyles();
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.avatar, box]}>
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" cachePolicy="memory-disk" transition={150} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>{initials(name, email)}</Text>
      )}
    </View>
  );
}

export type SheetOption = { label: string; icon: IconName; danger?: boolean; onPress: () => void };

export function ActionSheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel={t('common.close')} style={styles.scrim} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
        <ScrollView style={styles.sheetOptions} bounces={false}>
          {options.map((option) => (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              onPress={() => {
                tapHaptic();
                onClose();
                option.onPress();
              }}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.rowPressed]}>
              <RowIcon icon={option.icon} danger={option.danger} />
              <Text style={[styles.label, option.danger && styles.labelDanger]}>{option.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.sheetCancel, pressed && styles.rowPressed]}>
          <Text style={styles.sheetCancelLabel}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles(({ colors, sectionLabel }) => ({
  group: { gap: 8 },
  groupTitle: { ...sectionLabel, paddingHorizontal: 4 },
  groupFooter: { paddingHorizontal: 4, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 64 },
  row: { minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowPressed: { backgroundColor: colors.surface },
  disabled: { opacity: 0.45 },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: colors.dangerMuted },
  rowText: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  labelDanger: { color: colors.danger },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  value: { flexShrink: 1, maxWidth: '45%', textAlign: 'right', fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  avatar: { backgroundColor: colors.inverse, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarInitials: { fontFamily: fonts.displayBold, letterSpacing: 1, color: colors.onInverse },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: space.screen - 6,
    paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.handle, marginBottom: 12 },
  sheetTitle: { ...sectionLabel, paddingHorizontal: 8, paddingBottom: 6 },
  sheetOptions: { maxHeight: 420 },
  sheetRow: { minHeight: 56, paddingHorizontal: 8, borderRadius: radius.card, flexDirection: 'row', alignItems: 'center', gap: 14 },
  sheetCancel: {
    marginTop: 8,
    height: 52,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
}));
