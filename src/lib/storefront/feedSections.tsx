import { Image, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';

export type FeedTileModel = {
  key: string;
  label: string;
  image: string | null;
};

type Status = 'loading' | 'unavailable' | 'ready';

export function StorefrontUnavailable({
  loading,
  onRetry,
  testID,
}: {
  loading: boolean;
  onRetry: () => void;
  testID: string;
}) {
  if (loading) {
    return (
      <View testID={testID}>
        <ActivityIndicator accessibilityLabel="Loading the shop" />
        <Text>Loading the shop</Text>
      </View>
    );
  }
  return (
    <View testID={testID}>
      <Text>Can't load the shop</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry}>
        <Text>Try again</Text>
      </Pressable>
    </View>
  );
}

export function HomeFeed({
  status,
  tiles,
  onRetry,
  onOpen,
}: {
  status: Status;
  tiles: FeedTileModel[];
  onRetry: () => void;
  onOpen: (key: string, label: string) => void;
}) {
  if (status !== 'ready') {
    return <StorefrontUnavailable loading={status === 'loading'} onRetry={onRetry} testID="home-unavailable" />;
  }
  return (
    <ScrollView testID="home-feed">
      {tiles.map((tile) => (
        <Pressable key={tile.key} accessibilityRole="button" accessibilityLabel={tile.label} onPress={() => onOpen(tile.key, tile.label)}>
          {tile.image ? <Image accessibilityLabel="" source={{ uri: tile.image }} /> : null}
          <Text>{tile.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function ShopFeed({
  status,
  menus,
  onRetry,
  onOpen,
}: {
  status: Status;
  menus: FeedTileModel[];
  onRetry: () => void;
  onOpen: (key: string, label: string) => void;
}) {
  if (status !== 'ready') {
    return <StorefrontUnavailable loading={status === 'loading'} onRetry={onRetry} testID="shop-unavailable" />;
  }
  return (
    <ScrollView testID="shop-feed">
      {menus.map((menu) => (
        <Pressable key={menu.key} accessibilityRole="button" accessibilityLabel={menu.label} onPress={() => onOpen(menu.key, menu.label)}>
          {menu.image ? <Image source={{ uri: menu.image }} /> : null}
          <Text>{menu.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function HubCover({ image }: { image: string | null }) {
  if (!image) return <View testID="hub-cover-empty" />;
  return <Image testID="hub-cover" source={{ uri: image }} />;
}

export function HubTypeGrid({
  tiles,
  onOpen,
}: {
  tiles: FeedTileModel[];
  onOpen: (key: string, label: string) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <View testID="hub-types">
      {tiles.map((tile) => (
        <Pressable key={tile.key} accessibilityRole="button" accessibilityLabel={tile.label} onPress={() => onOpen(tile.key, tile.label)}>
          {tile.image ? <Image source={{ uri: tile.image }} /> : null}
          <Text>{tile.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AthleteCards({
  tiles,
  onOpen,
}: {
  tiles: FeedTileModel[];
  onOpen: (key: string, label: string) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <View testID="athlete-cards">
      {tiles.map((tile) => (
        <Pressable key={tile.key} accessibilityRole="button" accessibilityLabel={tile.label} onPress={() => onOpen(tile.key, tile.label)}>
          {tile.image ? <Image testID={`athlete-image-${tile.key}`} source={{ uri: tile.image }} /> : <View testID={`athlete-no-image-${tile.key}`} />}
          <Text>{tile.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AudienceChips({
  tiles,
  selected,
  allLabel,
  onSelect,
}: {
  tiles: { key: string; label: string }[];
  selected: string | undefined;
  allLabel: string;
  onSelect: (key: string | undefined) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <View testID="audience-chips">
      <Pressable accessibilityRole="button" accessibilityLabel={allLabel} onPress={() => onSelect(undefined)}>
        <Text>{allLabel}</Text>
      </Pressable>
      {tiles.map((tile) => (
        <Pressable key={tile.key} accessibilityRole="button" accessibilityState={{ selected: selected === tile.key }} accessibilityLabel={tile.label} onPress={() => onSelect(tile.key)}>
          <Text>{tile.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
