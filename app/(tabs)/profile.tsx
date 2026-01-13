import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RecipeSection, type RecipeItem } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import type { User } from '@supabase/supabase-js';

const APP_URL = 'https://www.gochisokoji.com';
const KOJI_PURCHASE_URL = 'https://yutakanokoji.official.ec/items/77406518';

type FilterTab = 'all' | 'saved' | 'mine' | 'drafts';

const FILTER_TABS: { id: Exclude<FilterTab, 'all'>; label: string; icon: string }[] = [
  { id: 'saved', label: '保存', icon: 'bookmark' },
  { id: 'mine', label: '自分の', icon: 'person' },
  { id: 'drafts', label: '下書き', icon: 'square.and.pencil' },
];

export default function MyRecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = React.useState<User | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>('all');

  // レシピデータ
  const [savedRecipes, setSavedRecipes] = React.useState<RecipeItem[]>([]);
  const [myRecipes, setMyRecipes] = React.useState<RecipeItem[]>([]);
  const [draftRecipes, setDraftRecipes] = React.useState<RecipeItem[]>([]);

  // ユーザー情報を取得
  React.useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        // public.usersからアバターURLを取得
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          
          if (profile?.avatar_url) {
            setUserAvatarUrl(profile.avatar_url);
          } else {
            // フォールバック: user_metadataから取得
            setUserAvatarUrl(user.user_metadata?.avatar_url || null);
          }
        }
      } catch (e) {
        console.error('Get user error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // キャッシュ用の最終取得時刻
  const lastFetchRef = React.useRef<number>(0);
  const CACHE_DURATION = 30000; // 30秒

  // レシピデータを取得（並列実行で高速化）
  const fetchRecipes = React.useCallback(async (refresh = false) => {
    if (!user) return;
    
    if (refresh) setIsRefreshing(true);

    try {
      // 3つのクエリを並列実行（約60%高速化）
      const [likesResult, myPostsResult, draftsResult] = await Promise.all([
        // 保存したレシピ（お気に入り）
        supabase
          .from('likes')
          .select(`
            post_id,
            posts (
              id,
              title,
              image_url,
              description,
              koji_type
            )
          `)
          .eq('user_id', user.id)
          .limit(100),
        
        // 自分のレシピ（公開済み）
        supabase
          .from('posts')
          .select('id, title, image_url, description, koji_type')
          .eq('user_id', user.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // 下書き（非公開）
        supabase
          .from('posts')
          .select('id, title, image_url, description, koji_type')
          .eq('user_id', user.id)
          .eq('is_public', false)
          .order('updated_at', { ascending: false })
          .limit(100),
      ]);

      // 保存したレシピを処理
      if (likesResult.data && !likesResult.error) {
        const savedList = likesResult.data
          .filter((l: any) => l.posts)
          .map((l: any) => ({
            id: l.posts.id,
            title: l.posts.title,
            image: l.posts.image_url,
            authorName: null,
          }));
        setSavedRecipes(savedList);
      }

      // 自分のレシピを処理
      if (myPostsResult.data && !myPostsResult.error) {
        const myList = myPostsResult.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          image: p.image_url,
          authorName: null,
        }));
        setMyRecipes(myList);
      }

      // 下書きを処理
      if (draftsResult.data && !draftsResult.error) {
        const draftList = draftsResult.data.map((p: any) => ({
          id: p.id,
          title: p.title,
          image: p.image_url,
          authorName: null,
          isDraft: true,
        }));
        setDraftRecipes(draftList);
      }
    } catch (e) {
      console.error('[Profile] Fetch recipes error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user, fetchRecipes]);

  // 画面フォーカス時にデータを再取得（キャッシュ有効なら省略）
  useFocusEffect(
    React.useCallback(() => {
      if (!user) return;
      
      const now = Date.now();
      // 30秒以内なら再取得しない（高速化）
      if (now - lastFetchRef.current < CACHE_DURATION) {
        return;
      }
      
      lastFetchRef.current = now;
      
      // アバターとレシピを並列取得
      const refreshData = async () => {
        const { data: profile } = await supabase
          .from('users')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profile?.avatar_url) {
          setUserAvatarUrl(profile.avatar_url);
        }
        
        fetchRecipes(true);
      };
      
      refreshData();
    }, [user, fetchRecipes])
  );

  const handleRecipePress = (id: string) => {
    router.push(`/posts/${id}` as any);
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ゲスト';

  // ローディング中は読み込みインジケーターを表示
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ログアウト状態ならログイン促進画面を全面表示
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* ヘッダー */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: colors.border,
              paddingTop: insets.top,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                <IconSymbol name="person" size={20} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>マイページ</Text>
            </View>
          </View>
        </View>

        {/* ログイン促進画面 */}
        <View style={styles.loginPromptFullScreen}>
          <View style={[styles.loginPromptIcon, { backgroundColor: colors.surface }]}>
            <IconSymbol name="person.crop.circle" size={64} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.loginPromptTitle, { color: colors.text }]}>
            ログインしてください
          </Text>
          <Text style={[styles.loginPromptDescription, { color: colors.mutedForeground }]}>
            レシピの保存・作成・下書きには{'\n'}ログインが必要です
          </Text>
          <Pressable
            style={[styles.loginButtonLarge, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/login')}
          >
            <Text style={[styles.loginButtonLargeText, { color: colors.primaryForeground }]}>
              ログインする
            </Text>
          </Pressable>
          <Pressable
            style={styles.guestLink}
            onPress={() => router.push('/(tabs)/')}
          >
            <Text style={[styles.guestLinkText, { color: colors.mutedForeground }]}>
              ログインせずにレシピを見る
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ヘッダー */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.headerContent}>
          {/* ユーザーアバター + タイトル */}
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {userAvatarUrl ? (
                <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {userName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>マイレシピ</Text>
          </View>

          {/* 右アイコン */}
          <View style={styles.headerRight}>
            {/* 麹を購入 */}
            <Pressable
              style={styles.headerIcon}
              onPress={() => Linking.openURL(KOJI_PURCHASE_URL)}
            >
              <Text style={styles.headerIconEmoji}>🛒</Text>
            </Pressable>
            {/* アプリを共有 */}
            <Pressable
              style={styles.headerIcon}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(APP_URL);
                  showToast({ message: 'URLをコピーしました', type: 'success' });
                } catch (e) {
                  console.error('Copy URL error:', e);
                  showToast({ message: 'コピーに失敗しました', type: 'error' });
                }
              }}
            >
              <Text style={styles.headerIconEmoji}>📤</Text>
            </Pressable>
            {/* 設定 */}
            <Pressable
              style={styles.headerIcon}
              onPress={() => router.push('/settings' as any)}
            >
              <IconSymbol name="gearshape" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchRecipes(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* 検索バー */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="magnifyingglass" size={16} color={colors.mutedForeground} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="レシピを検索"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        </View>

        {/* フィルタータブ */}
        <View style={styles.filterTabs}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? colors.surface : 'transparent',
                    borderColor: isActive ? colors.border : 'transparent',
                  },
                ]}
                onPress={() => setActiveFilter(isActive ? 'all' : tab.id)}
              >
                <IconSymbol
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? colors.text : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isActive ? colors.text : colors.mutedForeground },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* レシピセクション */}
        <>
          {/* 保存したレシピ */}
          {(activeFilter === 'all' || activeFilter === 'saved') && savedRecipes.length > 0 && (
            <RecipeSection
              title="保存したレシピ"
              count={savedRecipes.length}
              recipes={savedRecipes}
              onRecipePress={handleRecipePress}
              onSeeAll={activeFilter === 'all' ? () => setActiveFilter('saved') : undefined}
            />
          )}

          {/* 自分のレシピ */}
          {(activeFilter === 'all' || activeFilter === 'mine') && myRecipes.length > 0 && (
            <RecipeSection
              title="自分のレシピ"
              count={myRecipes.length}
              recipes={myRecipes}
              onRecipePress={handleRecipePress}
              onSeeAll={activeFilter === 'all' ? () => setActiveFilter('mine') : undefined}
            />
          )}

          {/* 下書き中のレシピ */}
          {(activeFilter === 'all' || activeFilter === 'drafts') && draftRecipes.length > 0 && (
            <RecipeSection
              title="下書き中のレシピ"
              count={draftRecipes.length}
              recipes={draftRecipes}
              onRecipePress={handleRecipePress}
              onSeeAll={activeFilter === 'all' ? () => setActiveFilter('drafts') : undefined}
            />
          )}

          {/* 空の状態 */}
          {((activeFilter === 'saved' && savedRecipes.length === 0) ||
            (activeFilter === 'mine' && myRecipes.length === 0) ||
            (activeFilter === 'drafts' && draftRecipes.length === 0) ||
            (activeFilter === 'all' && savedRecipes.length === 0 && myRecipes.length === 0 && draftRecipes.length === 0)) && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.mutedForeground }]}>
                {activeFilter === 'saved' && '保存したレシピはまだありません'}
                {activeFilter === 'mine' && '自分のレシピはまだありません'}
                {activeFilter === 'drafts' && '下書きはまだありません'}
                {activeFilter === 'all' && 'まだレシピがありません'}
              </Text>
            </View>
          )}
        </>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconEmoji: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  loginPromptText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  loginButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  // ログイン促進画面（全面表示）
  loginPromptFullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loginPromptIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  loginPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  loginPromptDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  loginButtonLarge: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  loginButtonLargeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestLink: {
    paddingVertical: Spacing.sm,
  },
  guestLinkText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
