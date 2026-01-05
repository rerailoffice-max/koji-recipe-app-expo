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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { RecipeSection, type RecipeItem } from '@/components/ui';
import type { User } from '@supabase/supabase-js';

type FilterTab = 'saved' | 'mine' | 'drafts';

const FILTER_TABS: { id: FilterTab; label: string; icon: string }[] = [
  { id: 'saved', label: '保存', icon: 'bookmark' },
  { id: 'mine', label: '自分の', icon: 'person' },
  { id: 'drafts', label: '下書き', icon: 'square.and.pencil' },
];

export default function MyRecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>('saved');

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

  // レシピデータを取得
  const fetchRecipes = React.useCallback(async (refresh = false) => {
    if (!user) return;
    
    if (refresh) setIsRefreshing(true);

    try {
      // 保存したレシピ（お気に入り）
      const { data: likes } = await supabase
        .from('likes')
        .select('post_id, posts(*)')
        .eq('user_id', user.id)
        .limit(10);

      if (likes) {
        setSavedRecipes(
          likes
            .filter((l: any) => l.posts)
            .map((l: any) => ({
              id: l.posts.id,
              title: l.posts.title,
              image: l.posts.image_url,
              authorName: null,
            }))
        );
      }

      // 自分のレシピ（公開済み）
      const { data: myPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (myPosts) {
        setMyRecipes(
          myPosts.map((p: any) => ({
            id: p.id,
            title: p.title,
            image: p.image_url,
            authorName: null,
          }))
        );
      }

      // 下書き（非公開）
      const { data: drafts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_public', false)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (drafts) {
        setDraftRecipes(
          drafts.map((p: any) => ({
            id: p.id,
            title: p.title,
            image: p.image_url,
            authorName: null,
            isDraft: true,
          }))
        );
      }
    } catch (e) {
      console.error('Fetch recipes error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      fetchRecipes();
    }
  }, [user, fetchRecipes]);

  const handleRecipePress = (id: string) => {
    console.log('Navigate to recipe:', id);
    // router.push(`/posts/${id}`);
  };

  const userAvatar = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ゲスト';

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
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>Re</Text>
              )}
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>マイレシピ</Text>
          </View>

          {/* 右アイコン */}
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerIcon}
              onPress={() => router.push('/settings' as any)}
            >
              <IconSymbol name="gearshape" size={22} color={colors.text} />
            </Pressable>
            <Pressable style={styles.headerIcon}>
              <IconSymbol name="bell" size={22} color={colors.text} />
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
                onPress={() => setActiveFilter(tab.id)}
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
        {user ? (
          <>
            {/* 保存したレシピ */}
            <RecipeSection
              title="保存したレシピ"
              count={savedRecipes.length}
              recipes={savedRecipes}
              onRecipePress={handleRecipePress}
            />

            {/* 自分のレシピ */}
            <RecipeSection
              title="自分のレシピ"
              count={myRecipes.length}
              recipes={myRecipes}
              onRecipePress={handleRecipePress}
            />

            {/* 下書き中のレシピ */}
            <RecipeSection
              title="下書き中のレシピ"
              count={draftRecipes.length}
              recipes={draftRecipes}
              onRecipePress={handleRecipePress}
            />
          </>
        ) : (
          <View style={styles.loginPrompt}>
            <Text style={[styles.loginPromptText, { color: colors.mutedForeground }]}>
              レシピを保存・作成するには{'\n'}ログインしてください
            </Text>
            <Pressable
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/login')}
            >
              <Text style={[styles.loginButtonText, { color: colors.primaryForeground }]}>
                ログイン
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
