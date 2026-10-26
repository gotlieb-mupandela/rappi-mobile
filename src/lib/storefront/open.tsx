import { router } from 'expo-router';

import { openCatalogFolder } from '@/src/components/FolderBrowser';
import type { StorefrontRoute } from '@/src/lib/storefront/contract';

/** Opens an app screen from a resolved target. The route value never comes from a feed URL. */
export function openStorefrontRoute(route: StorefrontRoute, name: string, crumbs: string[]) {
  switch (route.screen) {
    case 'home':
      router.push('/');
      return;
    case 'menu':
      router.push({
        pathname: '/menu/[menu]',
        params: route.path.length ? { menu: route.menu, path: route.path.join('/') } : { menu: route.menu },
      });
      return;
    case 'category':
      router.push({ pathname: '/category/[slug]', params: { slug: route.slug } });
      return;
    case 'group':
      openCatalogFolder({
        cat: route.cat,
        folder: route.group,
        name,
        audience: route.audience,
        crumbs,
        leaf: route.leaf,
      });
      return;
    default:
      return;
  }
}
