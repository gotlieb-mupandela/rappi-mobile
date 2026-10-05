import { useLocalSearchParams } from 'expo-router';

import { FolderBrowser } from '@/src/components/FolderBrowser';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <FolderBrowser slug={slug} trail={[]} leaf={false} />;
}
