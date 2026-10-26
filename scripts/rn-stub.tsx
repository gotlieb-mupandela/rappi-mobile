import { createElement, type ReactNode } from 'react';

type HostProps = {
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
  [key: string]: unknown;
};

function host(type: string) {
  return function Host(props: HostProps) {
    const { children, ...rest } = props;
    const body = typeof children === 'function' ? children({ pressed: false }) : children;
    return createElement(type, rest, body);
  };
}

export const Image = host('Image');
export const ScrollView = host('ScrollView');
export const View = host('View');
export const Text = host('Text');
export const Pressable = host('Pressable');
export const ActivityIndicator = host('ActivityIndicator');
export const StyleSheet = {
  create<T>(styles: T): T {
    return styles;
  },
  hairlineWidth: 1,
};
export const Platform = {
  OS: 'ios' as const,
  select<T>(options: { ios?: T; android?: T; default?: T }): T | undefined {
    return options.ios ?? options.default;
  },
};
