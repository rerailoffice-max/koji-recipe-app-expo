import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  onHide: () => void;
  duration?: number;
}

export function Toast({ visible, message, type, onHide, duration = 2500 }: ToastProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    if (visible) {
      // フェードイン
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // 自動で消える
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide, opacity, translateY]);

  if (!visible) return null;

  // タイプ別の色とアイコン
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          icon: 'checkmark.circle.fill' as const,
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          icon: 'xmark.circle.fill' as const,
        };
      case 'info':
      default:
        return {
          backgroundColor: colors.primary,
          icon: 'info.circle.fill' as const,
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          bottom: Math.max(insets.bottom, 16) + 80, // タブバーの上に表示
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor: typeStyles.backgroundColor }]}>
        <IconSymbol name={typeStyles.icon} size={20} color="#FFFFFF" />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
      },
    }),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '90%',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
