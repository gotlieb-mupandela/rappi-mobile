import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocale } from '@/src/i18n/LocaleProvider';
import { useBag } from '@/src/lib/bag';
import { tapHaptic } from '@/src/lib/haptics';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Tab = {
  key: string;
  href: Href;
  icon: IconName;
  activeIcon: IconName;
  match: (path: string) => boolean;
};

const TABS: Tab[] = [
  { key: 'home', href: '/', icon: 'home-outline', activeIcon: 'home', match: (p) => p === '/' },
  {
    key: 'shop',
    href: '/shop',
    icon: 'grid-outline',
    activeIcon: 'grid',
    match: (p) => p === '/shop' || p.startsWith('/category') || p.startsWith('/menu') || p.startsWith('/product'),
  },
  { key: 'search', href: '/search', icon: 'search-outline', activeIcon: 'search', match: (p) => p === '/search' },
  {
    key: 'bag',
    href: '/bag',
    icon: 'bag-outline',
    activeIcon: 'bag',
    match: (p) => p === '/bag' || p.startsWith('/checkout'),
  },
  {
    key: 'account',
    href: '/account',
    icon: 'person-outline',
    activeIcon: 'person',
    match: (p) =>
      p === '/account' ||
      ['/orders', '/wishlist', '/auth', '/settings', '/profile'].some((prefix) => p.startsWith(prefix)),
  },
];

export function TabBar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { totalQty } = useBag();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const label = t(`tabs.${tab.key}`);
        const active = tab.match(pathname);
        const color = active ? colors.accent : colors.muted;
        const labelColor = active ? colors.accentText : colors.muted;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (pathname === tab.href) return;
              tapHaptic();
              if (router.canDismiss()) router.dismissAll();
              router.navigate(tab.href);
            }}
            style={styles.item}>
            <View>
              <Ionicons name={active ? tab.activeIcon : tab.icon} size={24} color={color} />
              {tab.key === 'bag' && totalQty > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalQty > 99 ? '99+' : totalQty}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    gap: 3,
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.onAccent,
    fontFamily: fonts.bodyBold,
    fontSize: 9,
  },
}));
