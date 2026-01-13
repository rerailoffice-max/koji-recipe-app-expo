import {
    AppBar,
    CardPost,
    SearchFilter,
    TabBar,
    WeeklyBanner,
    type Ingredient,
    type WeeklyRecipe,
} from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // 栄養情報
  salt_g: number | null;
  calories: number | null;
  cooking_time_min: number | null;
  // タグ
  tags: string[] | null;
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
  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(new Set());
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

  // タグフィルタートグル
  const toggleTag = React.useCallback((id: string) => {
    setSelectedTags((prev) => {
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
    setSelectedTags(new Set());
  }, []);

  // 投稿をフィルタリング
  const filteredPosts = React.useMemo(() => {
    return posts.filter((p) => {
      // 麹タイプフィルター（OR条件）
      if (selectedKojis.size > 0 && !selectedKojis.has(p.koji_type)) return false;
      // タグフィルター（OR条件: 選択したタグのいずれかを含む）
      if (selectedTags.size > 0) {
        const postTags = p.tags || [];
        const hasMatchingTag = Array.from(selectedTags).some((tag) => postTags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      // テキスト検索
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${p.title ?? ''} ${p.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, query, selectedKojis, selectedTags]);

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
          salt_g,
          calories,
          cooking_time_min,
          tags,
          user:users(id, display_name, avatar_url, email)
        `)
        .eq('is_public', true);
      
      // ソート順を設定
      if (activeTab === 'popular') {
        query = query.order('view_count', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      // 全ての公開投稿を取得（制限なし）
      const { data, error } = await query;
      
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
        // 今日から始まって、月、火、水...と1週間を表示
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        const recipes: WeeklyRecipe[] = data.map((post, index) => {
          const date = new Date();
          date.setDate(date.getDate() + index); // 今日から未来へ
          return {
            id: post.id,
            title: post.title,
            image: post.image_url,
            day: days[date.getDay()],
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

  // キャッシュ用の最終取得時刻
  const lastFetchRef = React.useRef<number>(0);
  const CACHE_DURATION = 30000; // 30秒

  // 画面フォーカス時にデータを再取得（キャッシュ有効なら省略）
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      // 30秒以内なら再取得しない（高速化）
      if (now - lastFetchRef.current < CACHE_DURATION) {
        return;
      }
      
      lastFetchRef.current = now;
      fetchPosts(true);
      fetchWeeklyRecipes();
    }, [fetchPosts, fetchWeeklyRecipes])
  );

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
        cookingTimeMin={item.cooking_time_min}
        calories={item.calories}
        saltG={item.salt_g}
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
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
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
    [query, selectedKojis, toggleKoji, selectedTags, toggleTag, clearFilters, weeklyRecipes, isLoadingWeekly]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AppBar */}
      <AppBar
        titleComponent={
          Platform.OS === 'web' ? (
            <img
              src="/logo-gochisokoji.png"
              alt="GOCHISOKOJI"
              style={{ height: 24, width: 'auto', maxWidth: 180 }}
            />
          ) : (
            <Text style={styles.logoText}>GOCHISOKOJI</Text>
          )
        }
      />

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
  logoImage: {
    width: 180,
    height: 28,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#000',
  },
});
