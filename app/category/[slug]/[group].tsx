import { useLocalSearchParams } from 'expo-router';

import { FolderBrowser, parseCrumbs, parseTrail } from '@/src/components/FolderBrowser';

export default function GroupScreen() {
  const { slug, group, trail: rawTrail, leaf, audience, crumbs } = useLocalSearchParams<{
    slug: string;
    group: string;
    trail?: string;
    leaf?: string;
    audience?: string;
    crumbs?: string;
  }>();
  const parsed = parseTrail(rawTrail);
  const trail =
    parsed[parsed.length - 1]?.key === group ? parsed : [...parsed, { key: group, name: group.replace(/[-_]+/g, ' ') }];
  return (
    <FolderBrowser slug={slug} trail={trail} leaf={leaf === '1'} audience={audience || undefined} crumbs={parseCrumbs(crumbs)} />
  );
}
