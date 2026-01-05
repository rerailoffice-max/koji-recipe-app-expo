import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// API Base URL
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://koji-recipe-app-c72x.vercel.app';

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  koji_type: string;
  difficulty: string | null;
  view_count: number;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  created_at: string;
}

type Tab = 'all' | 'mine';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = React.useState<Tab>('all');
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // レシピ一覧を取得
  const fetchRecipes = React.useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      // 公開レシピ一覧を取得（APIエンドポイントがあれば使用）
      // 今回はダミーデータで表示
      // 本番では /api/posts?tab=all のようなエンドポイントを呼び出す
      const res = await fetch(`${API_BASE_URL}/api/posts?tab=${activeTab}&limit=20`);
      const json = await res.json().catch(() => null);

      if (res.ok && Array.isArray(json?.posts)) {
        setRecipes(json.posts);
      } else {
        // APIがない場合はダミーデータ
        setRecipes([]);
      }
    } catch (e) {
      console.error('Fetch recipes error:', e);
      setRecipes([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  React.useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // レシピカードをレンダリング
  const renderRecipeCard = React.useCallback(
    ({ item }: { item: Recipe }) => (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        onPress={() => {
          // TODO: レシピ詳細画面へ遷移
          console.log('Navigate to recipe:', item.id);
        }}
      >
        {/* 画像 */}
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.muted }]}>
            <Text style={{ color: colors.mutedForeground }}>🍳</Text>
          </View>
        )}

        {/* コンテンツ */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardKoji, { color: colors.primary }]}>
              {item.koji_type}
            </Text>
            <Text style={[styles.cardViews, { color: colors.mutedForeground }]}>
              👁 {item.view_count}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [colors]
  );

  const keyExtractor = React.useCallback((item: Recipe) => item.id, []);

  // 空状態
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {activeTab === 'mine' ? '投稿したレシピがありません' : 'レシピがありません'}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
        {activeTab === 'mine'
          ? 'AIタブからレシピを作成してみましょう'
          : '最初のレシピを投稿してみましょう'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* タブ */}
      <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('all')}
          style={[
            styles.tab,
            activeTab === 'all' && [styles.tabActive, { borderBottomColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'all' ? colors.primary : colors.mutedForeground },
            ]}
          >
            みんな
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('mine')}
          style={[
            styles.tab,
            activeTab === 'mine' && [styles.tabActive, { borderBottomColor: colors.primary }],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'mine' ? colors.primary : colors.mutedForeground },
            ]}
          >
            自分
          </Text>
        </Pressable>
      </View>

      {/* レシピ一覧 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeCard}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchRecipes(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.sm,
  },
  row: {
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    maxWidth: '50%',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: Spacing.sm,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardKoji: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardViews: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
