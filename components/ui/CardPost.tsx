import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontSize, scaledFontSize } from '@/hooks/use-font-size';
import { ChipTag } from './ChipTag';
import { IconSymbol } from './icon-symbol';

export interface Ingredient {
  name: string;
  amount: string;
}

interface CardPostProps {
  postId: string;
  image?: string | null;
  title: string;
  description?: string | null;
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  kojiType: string;
  ingredients?: Ingredient[] | null;
  totalMinutes?: number;
  postedDate?: string;
  isSaved?: boolean;
  isSaving?: boolean;
  onToggleSave?: (postId: string) => void;
  onClick?: () => void;
}

// 麹タイプの表示名変換
function toKojiDisplayName(kojiType: string): string {
  const map: Record<string, string> = {
    'たまねぎこうじ': '🧅 旨塩',
    'たまねぎ麹': '🧅 旨塩',
    '中華こうじ': '🧄 中華',
    '中華麹': '🧄 中華',
    'コンソメこうじ': '🥕 コンソメ',
    'コンソメ麹': '🥕 コンソメ',
  };
  return map[kojiType] || kojiType;
}

export function CardPost({
  postId,
  image,
  title,
  description,
  authorName,
  authorAvatarUrl,
  kojiType,
  ingredients,
  totalMinutes,
  postedDate,
  isSaved = false,
  isSaving = false,
  onToggleSave,
  onClick,
}: CardPostProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { fontScale } = useFontSize();

  // 材料名を最大3つ表示
  const ingredientNames = React.useMemo(() => {
    const names = (ingredients ?? [])
      .map((i) => (i?.name ?? '').trim())
      .filter(Boolean);
    return names.slice(0, 3);
  }, [ingredients]);

  const authorInitial = (authorName ?? '').trim().slice(0, 1) || 'U';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          opacity: pressed ? 0.95 : 1,
        },
        Shadows.sm,
      ]}
      onPress={onClick}
    >
      <View style={styles.content}>
        {/* 左側: 情報 */}
        <View style={styles.info}>
          {/* タイトル */}
          <Text style={[styles.title, { color: colors.text, fontSize: scaledFontSize(16, fontScale) }]} numberOfLines={2}>
            {title}
          </Text>

          {/* 材料 */}
          {ingredientNames.length > 0 && (
            <Text style={[styles.ingredients, { color: colors.mutedForeground, fontSize: scaledFontSize(13, fontScale) }]} numberOfLines={1}>
              {ingredientNames.join('、')}…
            </Text>
          )}

          {/* タグ */}
          <View style={styles.tags}>
            <ChipTag type="koji" label={toKojiDisplayName(kojiType)} />
          </View>

          {/* スペーサー */}
          <View style={styles.spacer} />

          {/* 著者 */}
          {authorName && (
            <View style={styles.author}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                {authorAvatarUrl ? (
                  <Image source={{ uri: authorAvatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.mutedForeground }]}>
                    {authorInitial}
                  </Text>
                )}
              </View>
              <Text style={[styles.authorName, { color: colors.mutedForeground, fontSize: scaledFontSize(13, fontScale) }]} numberOfLines={1}>
                {authorName}
              </Text>
            </View>
          )}
        </View>

        {/* 右側: サムネイル */}
        <View style={[styles.thumbnail, { backgroundColor: colors.muted }]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.thumbnailImage} />
          ) : (
            <View style={[styles.noImage, { backgroundColor: `${colors.primary}1A` }]}>
              <Text style={[styles.noImageText, { color: colors.mutedForeground }]}>写真なし</Text>
            </View>
          )}

          {/* ブックマークボタン */}
          {onToggleSave && (
            <Pressable
              style={({ pressed }) => [
                styles.bookmarkButton,
                {
                  backgroundColor: `${colors.surface}E6`,
                  borderColor: colors.border,
                  opacity: pressed || isSaving ? 0.7 : 1,
                },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onToggleSave(postId);
              }}
              disabled={isSaving}
            >
              <IconSymbol
                name={isSaved ? 'bookmark.fill' : 'bookmark'}
                size={16}
                color={isSaved ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    height: 130, // 固定高さ（バランス調整）
  },
  content: {
    flexDirection: 'row',
    paddingLeft: Spacing.sm,
    flex: 1, // 親の高さいっぱいに
  },
  info: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
    gap: Spacing.xs,
    justifyContent: 'flex-start', // コンテンツを上寄せ
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  ingredients: {
    fontSize: 13,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatar: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '500',
  },
  authorName: {
    fontSize: 13,
    flex: 1,
  },
  thumbnail: {
    width: 128,
    height: '100%', // 親の高さに合わせる
    position: 'relative',
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 12,
  },
  bookmarkButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

