import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';
import { RecipeCardSmall } from './RecipeCardSmall';

export interface RecipeItem {
  id: string;
  title: string;
  image: string | null;
  authorName?: string | null;
  isDraft?: boolean;
}

interface RecipeSectionProps {
  title: string;
  count: number;
  recipes: RecipeItem[];
  onSeeAll?: () => void;
  onRecipePress?: (id: string) => void;
}

export function RecipeSection({
  title,
  count,
  recipes,
  onSeeAll,
  onRecipePress,
}: RecipeSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (recipes.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <Pressable
        style={styles.header}
        onPress={onSeeAll}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>（{count}品）</Text>
        </View>
        <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
      </Pressable>

      {/* 横スクロールカード */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recipes.map((recipe) => (
          <RecipeCardSmall
            key={recipe.id}
            id={recipe.id}
            title={recipe.title}
            image={recipe.image}
            authorName={recipe.authorName}
            isDraft={recipe.isDraft}
            onPress={() => onRecipePress?.(recipe.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  count: {
    fontSize: 13,
    marginLeft: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
});

