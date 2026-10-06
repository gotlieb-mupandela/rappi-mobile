import { useLocalSearchParams } from 'expo-router';

import { CategoryHub } from '@/src/components/CategoryHub';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <CategoryHub slug={slug} />;
}
