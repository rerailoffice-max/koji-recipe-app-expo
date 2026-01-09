import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import {
  AppBar,
  TabBar,
  SearchFilter,
  WeeklyBanner,
  CardPost,
  type WeeklyRecipe,
  type Ingredient,
} from '@/components/ui';

// API Base URL - 本番用
const API_BASE_URL = 'https://api.gochisokoji.com';

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
  const router = useRouter();

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
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  
  // ユーザーと保存済みIDを取得
  React.useEffect(() => {
    const loadUserAndSaved = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        setSavedIds(new Set());
        return;
      }
      setCurrentUserId(user.id);
      
      // 保存済みの投稿IDを取得
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (likes) {
        setSavedIds(new Set(likes.map((l) => l.post_id)));
      }
    };
    
    loadUserAndSaved();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserAndSaved();
    });
    
    return () => subscription.unsubscribe();
  }, []);

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

  // 投稿を取得（Supabaseから直接）
  const fetchPosts = React.useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Supabaseから直接投稿を取得（同じプロジェクトを使用）
      let query = supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          image_url,
          koji_type,
          difficulty,
          ingredients,
          view_count,
          created_at,
          user:users(id, display_name, avatar_url, email)
        `)
        .eq('is_public', true);
      
      // ソート順を設定
      if (activeTab === 'popular') {
        query = query.order('view_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query.limit(20);
      
      if (error) {
        console.error('Supabase fetch error:', error);
      } else if (data) {
        // userフィールドを正しい形式に変換
        const formattedPosts = data.map((post: any) => ({
          ...post,
          user: Array.isArray(post.user) ? post.user[0] : post.user,
        }));
        setPosts(formattedPosts);
      }
    } catch (e) {
      console.error('Fetch posts error:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  // 週間おすすめを取得（Supabaseから直接）
  const fetchWeeklyRecipes = React.useCallback(async () => {
    setIsLoadingWeekly(true);
    try {
      // 最近7日間の人気投稿を取得
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, image_url, koji_type')
        .eq('is_public', true)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('view_count', { ascending: false })
        .limit(7);
      
      if (error) {
        console.error('Supabase weekly fetch error:', error);
      } else if (data && data.length > 0) {
        // 日付のラベルを付与（WeeklyRecipe型に合わせる: day, image）
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const recipes: WeeklyRecipe[] = data.map((post, index) => {
          const date = new Date();
          date.setDate(date.getDate() - index);
          return {
            id: post.id,
            title: post.title,
            image: post.image_url, // imageUrl → image
            day: days[date.getDay()], // dayLabel → day
          };
        });
        setWeeklyRecipes(recipes);
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
  const handleToggleSave = React.useCallback(async (postId: string) => {
    if (!currentUserId) {
      Alert.alert('ログインが必要です', '保存するにはログインしてください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログイン', onPress: () => router.push('/login') },
      ]);
      return;
    }
    
    if (savingIds.has(postId)) return;
    
    const wasSaved = savedIds.has(postId);
    
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    setSavingIds((prev) => new Set(prev).add(postId));
    
    try {
      if (wasSaved) {
        // 保存解除
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', postId);
        if (error) throw error;
      } else {
        // 保存
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: currentUserId, post_id: postId });
        if (error) throw error;
      }
    } catch (e: any) {
      // Rollback
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
      console.error('Save error:', e);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }, [currentUserId, savedIds, savingIds, router]);

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
        isSaving={savingIds.has(item.id)}
        onToggleSave={handleToggleSave}
        onClick={() => {
          router.push(`/posts/${item.id}` as any);
        }}
      />
    ),
    [savedIds, savingIds, handleToggleSave, router]
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
            router.push(`/posts/${id}` as any);
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
