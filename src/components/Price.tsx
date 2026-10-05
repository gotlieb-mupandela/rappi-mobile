import { Text, type StyleProp, type TextStyle } from 'react-native';

import { formatMoney } from '@/src/lib/money';
import { colors, fonts } from '@/src/theme';

type Props = {
  amount: number;
  style?: StyleProp<TextStyle>;
};

export function Price({ amount, style }: Props) {
  return (
    <Text style={[{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] }, style]}>
      {formatMoney(amount)}
    </Text>
  );
}
