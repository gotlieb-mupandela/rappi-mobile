import { useLocalSearchParams } from 'expo-router';

import { FolderBrowser, parseCrumbs, parseTrail } from '@/src/components/FolderBrowser';
import { canonicalFolderKey, fallbackFolderName } from '@/src/lib/folderSlugs';

export default function GroupScreen() {
  const { slug, group, trail: rawTrail, leaf, audience, crumbs } = useLocalSearchParams<{
    slug: string;
    group: string;
    trail?: string;
    leaf?: string;
    audience?: string;
    crumbs?: string;
  }>();
  const folderKey = canonicalFolderKey(group);
  const parsed = parseTrail(rawTrail);
  const last = parsed[parsed.length - 1];
  const trail =
    last && (last.key === group || last.key === folderKey)
      ? parsed.map((step, index) => (index === parsed.length - 1 ? { ...step, key: folderKey } : step))
      : [...parsed, { key: folderKey, name: fallbackFolderName(group) }];
  return (
    <FolderBrowser slug={slug} trail={trail} leaf={leaf === '1'} audience={audience || undefined} crumbs={parseCrumbs(crumbs)} />
  );
}
