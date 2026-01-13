import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface WeeklyRecipe {
  id: string;
  day: string;
  title: string;
  image: string | null;
}

interface WeeklyBannerProps {
  recipes: WeeklyRecipe[];
  onRecipeClick?: (id: string) => void;
  isLoading?: boolean;
}

function WeeklyBannerSkeleton() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <View key={i} style={styles.card}>
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]} />
          <View style={[styles.skeletonText, { backgroundColor: colors.muted }]} />
        </View>
      ))}
    </ScrollView>
  );
}

export function WeeklyBanner({ recipes, onRecipeClick, isLoading = false }: WeeklyBannerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>今週のおすすめレシピ</Text>
      </View>

      {/* コンテンツ */}
      {isLoading ? (
        <WeeklyBannerSkeleton />
      ) : recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            おすすめレシピを準備中...
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {recipes.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={styles.card}
              onPress={() => onRecipeClick?.(recipe.id)}
            >
              {/* 画像 */}
              <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
                {recipe.image ? (
                  <Image source={{ uri: recipe.image }} style={styles.image} />
                ) : (
                  <Text style={[styles.noImageText, { color: colors.mutedForeground }]}>
                    No Image
                  </Text>
                )}
                {/* 曜日バッジ */}
                <View style={[styles.dayBadge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.dayText, { color: colors.primaryForeground }]}>
                    {recipe.day}
                  </Text>
                </View>
              </View>
              {/* タイトル */}
              <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={1}>
                {recipe.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    width: 140,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  skeletonText: {
    height: 12,
    width: '75%',
    borderRadius: BorderRadius.sm,
  },
  noImageText: {
    fontSize: 12,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -6 }],
  },
  dayBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recipeTitle: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});



