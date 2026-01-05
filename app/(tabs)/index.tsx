import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  AppBar,
  TabBar,
  SearchFilter,
  WeeklyBanner,
  CardPost,
  type WeeklyRecipe,
  type Ingredient,
} from '@/components/ui';

// API Base URL
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://koji-recipe-app-c72x.vercel.app';

// 投稿データ型
interface Post {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  koji_type: string;
  difficulty: string | null;
  ingredients: Ingredient[] | null;
  view_count: number;
  created_at: string;
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
}

// タブ定義
const TABS = [
  { id: 'recent', label: '新着' },
  { id: 'popular', label: '人気' },
];

// 相対時間を計算
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays === 1) return '1日前';
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // 状態
  const [activeTab, setActiveTab] = React.useState<'recent' | 'popular'>('recent');
  const [query, setQuery] = React.useState('');
  const [selectedKojis, setSelectedKojis] = React.useState<Set<string>>(new Set());
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [weeklyRecipes, setWeeklyRecipes] = React.useState<WeeklyRecipe[]>([]);
  const [isLoadingWeekly, setIsLoadingWeekly] = React.useState(true);
  const [savedIds, setSavedIds] = React.useState<Set<string>>(new Set());

  // 麹フィルタートグル
  const toggleKoji = React.useCallback((id: string) => {
    setSelectedKojis((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // フィルタークリア
  const clearFilters = React.useCallback(() => {
    setSelectedKojis(new Set());
  }, []);

  // 投稿をフィルタリング
  const filteredPosts = React.useMemo(() => {
    return posts.filter((p) => {
      // 麹タイプフィルター
      if (selectedKojis.size > 0 && !selectedKojis.has(p.koji_type)) return false;
      // テキスト検索
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${p.title ?? ''} ${p.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, query, selectedKojis]);

  // 投稿を取得
  const fetchPosts = React.useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/posts?tab=${activeTab}&limit=20`);
      const json = await res.json().catch(() => null);
      if (res.ok && Array.isArray(json?.posts)) {
        setPosts(json.posts);
      }
    } catch (e) {
      console.error('Fetch posts error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  // 週間おすすめを取得
  const fetchWeeklyRecipes = React.useCallback(async () => {
    setIsLoadingWeekly(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/weekly-recipes`);
      const json = await res.json().catch(() => null);
      if (res.ok && Array.isArray(json?.recipes)) {
        setWeeklyRecipes(json.recipes);
      }
    } catch (e) {
      console.error('Fetch weekly recipes error:', e);
    } finally {
      setIsLoadingWeekly(false);
    }
  }, []);

  // 初期ロード
  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  React.useEffect(() => {
    fetchWeeklyRecipes();
  }, [fetchWeeklyRecipes]);

  // 保存トグル
  const handleToggleSave = React.useCallback((postId: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    // TODO: API連携
  }, []);

  // レシピカードをレンダリング
  const renderPost = React.useCallback(
    ({ item }: { item: Post }) => (
      <CardPost
        postId={item.id}
        image={item.image_url}
        title={item.title}
        description={item.description}
        authorName={item.user?.display_name || item.user?.email?.split('@')[0] || null}
        authorAvatarUrl={item.user?.avatar_url || null}
        kojiType={item.koji_type}
        ingredients={item.ingredients}
        postedDate={getRelativeTime(item.created_at)}
        isSaved={savedIds.has(item.id)}
        onToggleSave={handleToggleSave}
        onClick={() => {
          // TODO: 詳細画面へ遷移
          console.log('Navigate to post:', item.id);
        }}
      />
    ),
    [savedIds, handleToggleSave]
  );

  const keyExtractor = React.useCallback((item: Post) => item.id, []);

  // 空状態
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {query.trim() || selectedKojis.size > 0 ? '該当するレシピがありません' : 'まだ投稿がありません'}
      </Text>
    </View>
  );

  // ヘッダーコンポーネント（FlatListのListHeaderComponent）
  const ListHeader = React.useMemo(
    () => (
      <>
        {/* 検索 & フィルター */}
        <SearchFilter
          query={query}
          onQueryChange={setQuery}
          selectedKojis={selectedKojis}
          onToggleKoji={toggleKoji}
          onClearFilters={clearFilters}
        />

        {/* 今週のおすすめ */}
        <WeeklyBanner
          recipes={weeklyRecipes}
          isLoading={isLoadingWeekly}
          onRecipeClick={(id) => {
            console.log('Navigate to weekly recipe:', id);
          }}
        />
      </>
    ),
    [query, selectedKojis, toggleKoji, clearFilters, weeklyRecipes, isLoadingWeekly]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AppBar */}
      <AppBar title="麹レシピ" />

      {/* TabBar */}
      <TabBar tabs={TABS} activeId={activeTab} onTabChange={(id) => setActiveTab(id as 'recent' | 'popular')} />

      {/* 投稿一覧 */}
      <FlatList
        data={filteredPosts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchPosts(true)}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  emptyContainer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
