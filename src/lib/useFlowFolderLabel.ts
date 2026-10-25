import { useQuery } from '@tanstack/react-query';

import { catalogStructureQuery, fetchCatalog, fetchFolders } from '@/src/api/catalog';
import { flowFolderLabel } from '@/src/lib/folderSlugs';

/** Folder list or subs facet name for the flow tile. Flow until the feed answers. */
export function useFlowFolderLabel(cat: string, enabled: boolean): string {
  const folders = useQuery({
    queryKey: ['catalog-folders', cat],
    queryFn: () => fetchFolders(cat),
    enabled: enabled && !!cat,
    ...catalogStructureQuery,
  });
  const subs = useQuery({
    queryKey: ['catalog-subs', cat],
    queryFn: async () => (await fetchCatalog({ cat, pageSize: 1 })).facets?.subs ?? [],
    enabled: enabled && !!cat,
    ...catalogStructureQuery,
  });
  return flowFolderLabel(folders.data, subs.data);
}
