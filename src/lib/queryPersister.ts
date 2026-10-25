import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPublicCatalogPersister } from '@/src/lib/queryPersistence';

export const queryPersister = createPublicCatalogPersister(AsyncStorage);
