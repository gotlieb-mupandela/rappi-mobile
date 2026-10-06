import { ProductGrid } from '@/src/components/ProductGrid';
import { Screen } from '@/src/components/ui';

export default function KidsScreen() {
  return (
    <Screen title="Kids" back>
      <ProductGrid query={{ audience: 'kids' }} emptyMessage="No kids products right now." />
    </Screen>
  );
}
