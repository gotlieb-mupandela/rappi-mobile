import { StyleSheet } from 'react-native';

import { theme, type Theme } from '@/src/theme';

export function useTheme(): Theme {
  return theme;
}

export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T & StyleSheet.NamedStyles<T>) {
  const styles = StyleSheet.create(factory(theme));
  return function useStyles(): T {
    return styles;
  };
}
