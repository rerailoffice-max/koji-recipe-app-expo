import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ローディングメッセージの配列
const LOADING_MESSAGES = [
  '材料を確認中',
  'レシピを考案中',
  '仕上げ中',
];

export interface LoadingOverlayProps {
  visible: boolean;
  /** カスタムメッセージ（指定しない場合は自動切り替え） */
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // アニメーション用の値
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const [messageIndex, setMessageIndex] = React.useState(0);

  // 表示/非表示アニメーション
  React.useEffect(() => {
    if (visible) {
      setMessageIndex(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  // 回転アニメーション（スピナー）
  React.useEffect(() => {
    if (!visible) return;

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotateAnimation.start();

    return () => rotateAnimation.stop();
  }, [visible, rotateAnim]);

  // パルスアニメーション
  React.useEffect(() => {
    if (!visible) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [visible, pulseAnim]);

  // メッセージ切り替え
  React.useEffect(() => {
    if (!visible || message) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev >= LOADING_MESSAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [visible, message]);

  // 回転の補間
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentMessage = message || LOADING_MESSAGES[messageIndex];

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* スピナー */}
          <Animated.View
            style={[
              styles.spinnerContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {/* 外側のリング */}
            <Animated.View
              style={[
                styles.spinnerOuter,
                {
                  borderColor: `${colors.primary}20`,
                  transform: [{ rotate }],
                },
              ]}
            >
              {/* アクセントアーク */}
              <View
                style={[
                  styles.spinnerArc,
                  { borderTopColor: colors.primary },
                ]}
              />
            </Animated.View>

            {/* 中央のドット */}
            <View
              style={[
                styles.spinnerCenter,
                { backgroundColor: colors.primary },
              ]}
            />
          </Animated.View>

          {/* メッセージ */}
          <Text style={[styles.message, { color: colors.text }]}>
            {currentMessage}...
          </Text>

          {/* プログレスドット */}
          <View style={styles.progressContainer}>
            {LOADING_MESSAGES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressDot,
                  {
                    backgroundColor:
                      idx <= messageIndex ? colors.primary : `${colors.primary}30`,
                  },
                ]}
              />
            ))}
          </View>

          {/* サブテキスト */}
          <Text style={[styles.subText, { color: colors.mutedForeground }]}>
            GOCHISOシェフが考え中
          </Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    }),
  },
  card: {
    width: 280,
    paddingVertical: Spacing.xl + Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl + 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  spinnerOuter: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
  },
  spinnerArc: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopWidth: 3,
  },
  spinnerCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
