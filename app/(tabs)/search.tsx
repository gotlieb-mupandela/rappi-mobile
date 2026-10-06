import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ProductGrid } from '@/src/components/ProductGrid';
import { Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius, space } from '@/src/theme';

export default function SearchScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useStyles();
  const input = useRef<TextInput>(null);
  const [value, setValue] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);

  useFocusEffect(
    useCallback(() => {
      const id = setTimeout(() => input.current?.focus(), 250);
      return () => clearTimeout(id);
    }, []),
  );

  return (
    <Screen title={t('search.title')}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={setValue}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          onSubmitEditing={() => setQuery(value.trim())}
          style={styles.input}
        />
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setValue('')} style={styles.clear}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {query ? (
        <ProductGrid query={{ q: query }} emptyMessage={t('search.noMatches', { query })} />
      ) : (
        <View style={styles.prompt}>
          <Text style={styles.promptTitle}>{t('search.promptTitle')}</Text>
          <Text style={styles.promptBody}>{t('search.promptBody')}</Text>
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  searchWrap: {
    marginHorizontal: space.screen,
    marginTop: 12,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.input,
    backgroundColor: colors.surface,
  },
  searchIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 10,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
  },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  prompt: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 8 },
  promptTitle: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.text },
  promptBody: { maxWidth: 280, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
}));
