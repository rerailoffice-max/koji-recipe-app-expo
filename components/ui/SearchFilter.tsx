import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

interface KojiFilter {
  id: string;
  label: string;
  icon: string;
}

const KOJI_FILTERS: KojiFilter[] = [
  { id: 'たまねぎこうじ', label: '旨塩', icon: '🧅' },
  { id: 'コンソメこうじ', label: 'コンソメ', icon: '🥕' },
  { id: '中華こうじ', label: '中華', icon: '🧄' },
];

interface SearchFilterProps {
  query: string;
  onQueryChange: (query: string) => void;
  selectedKojis: Set<string>;
  onToggleKoji: (kojiId: string) => void;
  onClearFilters?: () => void;
}

export function SearchFilter({
  query,
  onQueryChange,
  selectedKojis,
  onToggleKoji,
  onClearFilters,
}: SearchFilterProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

        {/* クリアボタン */}
        {selectedKojis.size > 0 && onClearFilters && (
          <View style={styles.clearFilterContainer}>
            <Pressable onPress={onClearFilters}>
              <Text style={[styles.clearFilterText, { color: colors.mutedForeground }]}>クリア</Text>
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
  clearFilterContainer: {
    alignItems: 'center',
  },
  clearFilterText: {
    fontSize: 12,
  },
});



