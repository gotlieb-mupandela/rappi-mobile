import { useLocalSearchParams } from 'expo-router';

import { FolderBrowser, parseTrail } from '@/src/components/FolderBrowser';

export default function GroupScreen() {
  const { slug, group, trail: rawTrail, leaf } = useLocalSearchParams<{
    slug: string;
    group: string;
    trail?: string;
    leaf?: string;
  }>();
  const parsed = parseTrail(rawTrail);
  const trail =
    parsed[parsed.length - 1]?.key === group ? parsed : [...parsed, { key: group, name: group.replace(/[-_]+/g, ' ') }];
  return <FolderBrowser slug={slug} trail={trail} leaf={leaf === '1'} />;
}
