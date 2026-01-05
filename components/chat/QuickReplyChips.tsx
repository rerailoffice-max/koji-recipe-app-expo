import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface QuickReply {
  id: string;
  label: string;
  text: string;
}

interface QuickReplyChipsProps {
  replies: QuickReply[];
  onPress: (reply: QuickReply) => void;
  disabled?: boolean;
}

export function QuickReplyChips({ replies, onPress, disabled }: QuickReplyChipsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (replies.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.chipsWrapper}>
        {replies.map((reply) => (
          <Pressable
            key={reply.id}
            onPress={() => onPress(reply)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: pressed ? colors.primary : `${colors.primary}66`,
                backgroundColor: pressed ? `${colors.primary}1A` : `${colors.primary}0D`,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: colors.primary }]}>
              {reply.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  chip: {
    height: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

