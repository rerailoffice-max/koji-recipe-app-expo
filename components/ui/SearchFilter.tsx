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

// カテゴリ名の日本語マッピング
const CATEGORY_LABELS: Record<string, string> = {
  ingredient: '食材',
  style: 'スタイル',
  diet: 'ダイエット',
  dish_type: '料理タイプ',
};

// デフォルトのタグ（APIから取得できない場合のフォールバック）
const DEFAULT_TAGS: TagItem[] = [
  { id: '魚', name: '魚', emoji: '🐟', category: 'ingredient' },
  { id: '肉', name: '肉', emoji: '🍖', category: 'ingredient' },
  { id: '卵', name: '卵', emoji: '🥚', category: 'ingredient' },
  { id: '野菜', name: '野菜', emoji: '🥬', category: 'ingredient' },
  { id: '時短', name: '時短', emoji: '⚡', category: 'style' },
  { id: '作り置き', name: '作り置き', emoji: '📦', category: 'style' },
  { id: 'おつまみ', name: 'おつまみ', emoji: '🍺', category: 'style' },
  { id: 'ダイエット', name: 'ダイエット', emoji: '🏃', category: 'diet' },
  { id: '低糖質', name: '低糖質', emoji: '🥗', category: 'diet' },
  { id: '主菜', name: '主菜', emoji: '🍳', category: 'dish_type' },
  { id: '副菜', name: '副菜', emoji: '🥒', category: 'dish_type' },
  { id: 'スープ', name: 'スープ', emoji: '🍲', category: 'dish_type' },
  { id: 'サラダ', name: 'サラダ', emoji: '🥗', category: 'dish_type' },
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
  // 初期表示するタグ数（デフォルト8）
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
  initialTagCount = 8,
}: SearchFilterProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // タグ展開状態
  const [isTagsExpanded, setIsTagsExpanded] = React.useState(false);
  
  // 表示するタグ
  const displayTags = tags && tags.length > 0 ? tags : DEFAULT_TAGS;
  const hasMoreTags = displayTags.length > initialTagCount;
  
  // クリアボタン表示条件
  const hasActiveFilters = selectedKojis.size > 0 || selectedTags.size > 0;

  // カテゴリ別にタグをグループ化
  const tagsByCategory = React.useMemo(() => {
    const grouped: Record<string, TagItem[]> = {};
    for (const tag of displayTags) {
      const cat = tag.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(tag);
    }
    return grouped;
  }, [displayTags]);

  // タグチップのレンダリング
  const renderTagChip = (tag: TagItem) => {
    const isSelected = selectedTags.has(tag.name);
    return (
      <Pressable
        key={tag.id || tag.name}
        onPress={() => onToggleTag?.(tag.name)}
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
  };

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
            {!isTagsExpanded ? (
              // 折りたたみ表示（最初のN個）
              <View style={styles.tagFilters}>
                {displayTags.slice(0, initialTagCount).map(renderTagChip)}
              </View>
            ) : (
              // 展開表示（カテゴリ別）
              <View style={styles.expandedTagsContainer}>
                {Object.entries(tagsByCategory).map(([category, categoryTags]) => (
                  <View key={category} style={styles.categorySection}>
                    <Text style={[styles.categoryLabel, { color: colors.mutedForeground }]}>
                      {CATEGORY_LABELS[category] || category}
                    </Text>
                    <View style={styles.tagFilters}>
                      {categoryTags.map(renderTagChip)}
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* もっと見る/閉じるボタン */}
            {hasMoreTags && (
              <Pressable 
                onPress={() => setIsTagsExpanded(!isTagsExpanded)}
                style={[styles.expandButton, { backgroundColor: `${colors.primary}10` }]}
              >
                <Text style={[styles.expandText, { color: colors.primary }]}>
                  {isTagsExpanded ? '▲ 閉じる' : `▼ もっと見る（+${displayTags.length - initialTagCount}）`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* クリアボタン */}
        {hasActiveFilters && onClearFilters && (
          <View style={styles.clearFilterContainer}>
            <Pressable onPress={onClearFilters} style={styles.clearFilterButton}>
              <IconSymbol name="xmark.circle.fill" size={14} color={colors.mutedForeground} />
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
  expandedTagsContainer: {
    gap: Spacing.sm,
  },
  categorySection: {
    gap: 4,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  expandButton: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignSelf: 'center',
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearFilterContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFilterText: {
    fontSize: 12,
  },
});
