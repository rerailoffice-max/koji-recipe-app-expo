import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

interface RecipeCardSmallProps {
  id: string;
  title: string;
  image?: string | null;
  authorName?: string | null;
  isDraft?: boolean;
  onPress?: () => void;
}

export function RecipeCardSmall({
  id,
  title,
  image,
  authorName,
  isDraft = false,
  onPress,
}: RecipeCardSmallProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={onPress}
    >
      {/* 画像 */}
      <View style={[styles.imageContainer, { backgroundColor: colors.muted }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.noImage}>
            <IconSymbol name="photo" size={24} color={colors.mutedForeground} />
          </View>
        )}
        
        {/* 非公開バッジ */}
        {isDraft && (
          <View style={[styles.draftBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <IconSymbol name="lock.fill" size={10} color="#fff" />
            <Text style={styles.draftText}>非公開</Text>
          </View>
        )}
      </View>

      {/* タイトル */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {title}
      </Text>

      {/* 著者名 */}
      {authorName && (
        <Text style={[styles.author, { color: colors.mutedForeground }]} numberOfLines={1}>
          {authorName}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  draftText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  author: {
    fontSize: 11,
    marginTop: 2,
  },
});

