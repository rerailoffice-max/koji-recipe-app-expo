import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { AppBar } from '@/components/ui/AppBar';
import { ChipTag } from '@/components/ui/ChipTag';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 型定義
interface Ingredient {
  name: string;
  amount: string;
}

interface Step {
  order: number;
  description: string;
  image_url?: string | null;
}

interface PostUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  koji_type: string;
  difficulty: string | null;
  ingredients: Ingredient[] | null;
  steps: Step[] | null;
  view_count: number;
  user_id: string;
  user: PostUser | null;
}

// 麹タイプの表示名変換
function toKojiDisplayName(kojiType: string): string {
  const map: Record<string, string> = {
    'たまねぎこうじ': '旨塩風こうじ',
    '中華こうじ': '中華風こうじ',
    'コンソメこうじ': 'コンソメ風こうじ',
    '中華麹': '中華風こうじ',
    'コンソメ麹': 'コンソメ風こうじ',
    'たまねぎ麹': '旨塩風こうじ',
  };
  return map[kojiType] || kojiType;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [post, setPost] = React.useState<Post | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);

  // 投稿データを取得
  React.useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            user:users(id, display_name, avatar_url)
          `)
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error('Post fetch error:', error);
          Alert.alert('エラー', 'レシピの取得に失敗しました');
          router.back();
          return;
        }

        setPost(data as Post);
      } catch (e) {
        console.error('Post fetch error:', e);
        Alert.alert('エラー', 'レシピの取得に失敗しました');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, router]);

  // ユーザーと保存状態を取得
  React.useEffect(() => {
    const loadUserAndSavedState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCurrentUserId(null);
        setIsSaved(false);
        return;
      }

      setCurrentUserId(user.id);

      if (post?.id) {
        const { data: like } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .single();

        setIsSaved(!!like);
      }
    };

    loadUserAndSavedState();
  }, [post?.id]);

  // 保存トグル
  const handleToggleSave = async () => {
    if (!currentUserId) {
      Alert.alert('ログインが必要です', '保存するにはログインしてください', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'ログイン', onPress: () => router.push('/login') },
      ]);
      return;
    }

    if (!post || isSaving) return;
    setIsSaving(true);

    const prevSaved = isSaved;
    setIsSaved(!prevSaved);

    try {
      if (prevSaved) {
        // 保存を解除
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id);

        if (error) throw error;
      } else {
        // 保存
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: currentUserId, post_id: post.id });

        if (error) throw error;
      }
    } catch (e: any) {
      console.error('Save error:', e);
      setIsSaved(prevSaved);
      Alert.alert('エラー', prevSaved ? '保存の解除に失敗しました' : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const isOwner = !!currentUserId && post?.user_id === currentUserId;
  const ingredients = post?.ingredients ?? [];
  const steps = post?.steps ?? [];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppBar
          title="レシピ詳細"
          leftAction={
            <Pressable onPress={() => router.back()} style={styles.appBarButton}>
              <IconSymbol name="chevron.left" size={20} color={colors.text} />
            </Pressable>
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppBar
          title="レシピ詳細"
          leftAction={
            <Pressable onPress={() => router.back()} style={styles.appBarButton}>
              <IconSymbol name="chevron.left" size={20} color={colors.text} />
            </Pressable>
          }
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            レシピが見つかりませんでした
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AppBar */}
      <AppBar
        title={post.title}
        leftAction={
          <Pressable onPress={() => router.back()} style={styles.appBarButton}>
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </Pressable>
        }
        rightAction={
          isOwner ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/compose/edit',
                  params: {
                    draftId: post.id,
                    title: post.title || '',
                    description: post.description || '',
                    koji_type: post.koji_type || '中華麹',
                    difficulty: post.difficulty || 'かんたん',
                    ingredients: JSON.stringify(post.ingredients || []),
                    steps: JSON.stringify(post.steps || []),
                  },
                })
              }
              style={styles.appBarButton}
            >
              <Text style={[styles.editButtonText, { color: colors.text }]}>編集</Text>
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* メイン画像 */}
        <View style={styles.imageContainer}>
          {post.image_url ? (
            <Image source={{ uri: post.image_url }} style={styles.mainImage} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: `${colors.primary}10` }]}>
              <View
                style={[
                  styles.placeholderIcon,
                  { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}20` },
                ]}
              >
                <Text style={[styles.placeholderText, { color: colors.primary }]}>麹</Text>
              </View>
              <Text style={[styles.placeholderLabel, { color: colors.mutedForeground }]}>
                写真なし
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* タイトルと保存ボタン */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {post.title}
            </Text>
            <Pressable
              onPress={handleToggleSave}
              disabled={isSaving}
              style={[
                styles.saveButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <IconSymbol
                name={isSaved ? 'bookmark.fill' : 'bookmark'}
                size={20}
                color={isSaved ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          </View>

          {/* タグ */}
          <View style={styles.tags}>
            <ChipTag type="koji" label={toKojiDisplayName(post.koji_type)} />
            {post.difficulty && <ChipTag type="difficulty" label={post.difficulty} />}
          </View>

          {/* 投稿者情報 */}
          <View style={styles.authorRow}>
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              {post.user?.avatar_url ? (
                <Image source={{ uri: post.user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.text }]}>
                  {post.user?.display_name?.[0] || 'U'}
                </Text>
              )}
            </View>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {post.user?.display_name || 'ユーザー'}
            </Text>
          </View>

          {/* 説明 */}
          {post.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>説明</Text>
              <Pressable
                onPress={() => setIsDescriptionExpanded((v) => !v)}
                style={[styles.descriptionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text
                  style={[styles.descriptionText, { color: colors.text }]}
                  numberOfLines={isDescriptionExpanded ? undefined : 2}
                >
                  {post.description}
                </Text>
              </Pressable>
            </View>
          )}

          {/* 材料 */}
          {ingredients.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>材料</Text>
              {ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientRow,
                    index < ingredients.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Text style={[styles.ingredientName, { color: colors.text }]}>
                    {ingredient.name}
                  </Text>
                  <Text style={[styles.ingredientAmount, { color: colors.mutedForeground }]}>
                    {ingredient.amount}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 手順 */}
          {steps.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>作り方</Text>
              {steps.map((step) => (
                <View key={step.order} style={styles.stepRow}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.stepNumberText, { color: colors.primaryForeground }]}>
                      {step.order}
                    </Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepDescription, { color: colors.text }]}>
                      {step.description}
                    </Text>
                    {step.image_url && (
                      <Image source={{ uri: step.image_url }} style={styles.stepImage} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 閲覧数 */}
          <Text style={[styles.viewCount, { color: colors.mutedForeground }]}>
            {post.view_count} 回閲覧
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    aspectRatio: 4 / 5,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderLabel: {
    fontSize: 12,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  saveButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  ingredientName: {
    fontSize: 14,
  },
  ingredientAmount: {
    fontSize: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  stepImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
  },
  viewCount: {
    fontSize: 14,
    paddingTop: Spacing.md,
  },
});

