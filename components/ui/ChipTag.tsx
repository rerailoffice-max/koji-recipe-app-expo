import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ChipType = 'koji' | 'time' | 'count' | 'difficulty' | 'tag';

interface ChipTagProps {
  label: string;
  type?: ChipType;
  icon?: React.ReactNode;
}

export function ChipTag({ label, type = 'koji', icon }: ChipTagProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getTypeStyles = () => {
    switch (type) {
      case 'koji':
        return {
          backgroundColor: `${colors.primary}1A`, // 10% opacity
          borderColor: `${colors.primary}33`, // 20% opacity
          textColor: colors.primary,
        };
      case 'tag':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          textColor: colors.text,
        };
      case 'time':
      case 'count':
      case 'difficulty':
      default:
        return {
          backgroundColor: colors.muted,
          borderColor: 'transparent',
          textColor: colors.mutedForeground,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: typeStyles.backgroundColor,
          borderColor: typeStyles.borderColor,
        },
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={[styles.label, { color: typeStyles.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  icon: {
    width: 12,
    height: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});



