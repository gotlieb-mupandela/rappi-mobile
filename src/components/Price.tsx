import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useLocale } from '@/src/i18n/LocaleProvider';
import { useTheme } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

type Props = {
  amount: number;
  style?: StyleProp<TextStyle>;
};

export function Price({ amount, style }: Props) {
  const { formatMoney } = useLocale();
  const { colors } = useTheme();
  return (
    <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] }, style]}>
      {formatMoney(amount)}
    </Text>
  );
}
