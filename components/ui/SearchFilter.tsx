import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

interface KojiFilter {
  id: string;
  label: string;
  icon: string;
}

const KOJI_FILTERS: KojiFilter[] = [
  { id: 'たまねぎ麹', label: '旨塩', icon: '🧅' },
  { id: 'コンソメ麹', label: 'コンソメ', icon: '🥕' },
  { id: '中華麹', label: '中華', icon: '🧄' },
];

// タグの型定義
export interface TagItem {
  id: string;
  name: string;
  category?: string;
  emoji?: string;
  display_order?: number;
}

// デフォルトのタグ（APIから取得できない場合のフォールバック）
const DEFAULT_TAGS: TagItem[] = [
  { id: '魚', name: '魚', emoji: '🐟', category: 'ingredient' },
  { id: '肉', name: '肉', emoji: '🍖', category: 'ingredient' },
  { id: '野菜', name: '野菜', emoji: '🥬', category: 'ingredient' },
  { id: '時短', name: '時短', emoji: '⚡', category: 'style' },
  { id: '主菜', name: '主菜', emoji: '🍳', category: 'dish_type' },
  { id: 'スープ', name: 'スープ', emoji: '🍲', category: 'dish_type' },
];

interface SearchFilterProps {
  query: string;
  onQueryChange: (query: string) => void;
  selectedKojis: Set<string>;
  onToggleKoji: (kojiId: string) => void;
  selectedTags?: Set<string>;
  onToggleTag?: (tagId: string) => void;
  onClearFilters?: () => void;
  // 動的タグリスト（指定しない場合はDEFAULT_TAGSを使用）
  tags?: TagItem[];
  // 初期表示するタグ数（デフォルト6）
  initialTagCount?: number;
}

export function SearchFilter({
  query,
  onQueryChange,
  selectedKojis,
  onToggleKoji,
  selectedTags = new Set(),
  onToggleTag,
  onClearFilters,
  tags = DEFAULT_TAGS,
  initialTagCount = 6,
}: SearchFilterProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // タグ展開状態
  const [isTagsExpanded, setIsTagsExpanded] = React.useState(false);
  
  // 表示するタグ
  const displayTags = tags || DEFAULT_TAGS;
  const visibleTags = isTagsExpanded ? displayTags : displayTags.slice(0, initialTagCount);
  const hasMoreTags = displayTags.length > initialTagCount;
  
  // クリアボタン表示条件
  const hasActiveFilters = selectedKojis.size > 0 || selectedTags.size > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* 検索窓 */}
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="食材やレシピ名で検索..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => onQueryChange('')}>
              <Text style={[styles.clearText, { color: colors.primary }]}>クリア</Text>
            </Pressable>
          )}
        </View>

        {/* 麹フィルター */}
        <View style={styles.filters}>
          {KOJI_FILTERS.map((koji) => {
            const isSelected = selectedKojis.has(koji.id);
            return (
              <Pressable
                key={koji.id}
                onPress={() => onToggleKoji(koji.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.primary : `${colors.muted}80`,
                  },
                ]}
              >
                <Text style={styles.filterIcon}>{koji.icon}</Text>
                <Text
                  style={[
                    styles.filterLabel,
                    { color: isSelected ? colors.primaryForeground : colors.text },
                  ]}
                >
                  {koji.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* タグフィルター */}
        {onToggleTag && displayTags.length > 0 && (
          <View style={styles.tagSection}>
            <View style={styles.tagFilters}>
              {visibleTags.map((tag) => {
                const isSelected = selectedTags.has(tag.name);
                return (
                  <Pressable
                    key={tag.id || tag.name}
                    onPress={() => onToggleTag(tag.name)}
                    style={[
                      styles.tagChip,
                      {
                        backgroundColor: isSelected ? `${colors.primary}20` : colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {tag.emoji && <Text style={styles.tagIcon}>{tag.emoji}</Text>}
                    <Text
                      style={[
                        styles.tagLabel,
                        { color: isSelected ? colors.primary : colors.mutedForeground },
                      ]}
                    >
                      {tag.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            
            {/* もっと見る/閉じるボタン */}
            {hasMoreTags && (
              <Pressable 
                onPress={() => setIsTagsExpanded(!isTagsExpanded)}
                style={styles.expandButton}
              >
                <Text style={[styles.expandText, { color: colors.primary }]}>
                  {isTagsExpanded ? '閉じる ▲' : `もっと見る (${displayTags.length - initialTagCount}件) ▼`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* クリアボタン */}
        {hasActiveFilters && onClearFilters && (
          <View style={styles.clearFilterContainer}>
            <Pressable onPress={onClearFilters}>
              <Text style={[styles.clearFilterText, { color: colors.mutedForeground }]}>
                フィルターをクリア
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
  },
  filterIcon: {
    fontSize: 14,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagSection: {
    marginTop: Spacing.xs,
  },
  tagFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagIcon: {
    fontSize: 12,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearFilterContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  clearFilterText: {
    fontSize: 12,
  },
});
