import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  type ImageSourcePropType,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontSize, scaledFontSize } from '@/hooks/use-font-size';

// ローディングメッセージの配列
const LOADING_MESSAGES = [
  { text: '材料を確認中', emoji: '📝' },
  { text: 'レシピを考案中', emoji: '🍳' },
  { text: '仕上げ中', emoji: '✨' },
];

export interface RecipeLoadingBubbleProps {
  /** AIアバター。URL文字列 or require() の画像を許容 */
  aiAvatarSrc?: string | ImageSourcePropType | null;
}

export function RecipeLoadingBubble({ aiAvatarSrc }: RecipeLoadingBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { fontScale } = useFontSize();

  // アニメーション用の値
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const [messageIndex, setMessageIndex] = React.useState(0);

  // 揺れアニメーション
  React.useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 弾むようなスケールアニメーション
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    scaleAnimation.start();

    return () => {
      rotateAnimation.stop();
      scaleAnimation.stop();
    };
  }, [rotateAnim, scaleAnim]);

  // メッセージ切り替え
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        // 最後のメッセージに到達したらそのまま維持
        if (prev >= LOADING_MESSAGES.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // 回転の補間
  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const currentMessage = LOADING_MESSAGES[messageIndex];

  return (
    <View style={[styles.container, styles.aiContainer]}>
      {/* AIアバター */}
      <View style={styles.avatarWrapper}>
        {aiAvatarSrc ? (
          <Image
            source={typeof aiAvatarSrc === 'string' ? { uri: aiAvatarSrc } : aiAvatarSrc}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
            <Text style={[styles.avatarText, { color: colors.mutedForeground }]}>AI</Text>
          </View>
        )}
      </View>

      {/* ローディングバブル */}
      <View
        style={[
          styles.bubble,
          styles.aiBubble,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* 揺れるアイコン */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ rotate }, { scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.cookingIcon}>{currentMessage.emoji}</Text>
        </Animated.View>

        {/* メッセージ */}
        <Text
          style={[
            styles.text,
            {
              fontSize: scaledFontSize(15, fontScale),
              lineHeight: scaledFontSize(22, fontScale),
              color: colors.text,
            },
          ]}
        >
          {currentMessage.text}...
        </Text>

        {/* 進捗ドット */}
        <View style={styles.progressDots}>
          {LOADING_MESSAGES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx <= messageIndex ? colors.primary : colors.muted,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  avatarWrapper: {
    width: 32,
    height: 32,
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    flexShrink: 1,
    alignItems: 'center',
    minWidth: 180,
  },
  aiBubble: {
    borderWidth: 1,
    borderTopLeftRadius: BorderRadius.sm,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  cookingIcon: {
    fontSize: 48,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
