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
  '食材を煮込み中',
  '味を染み込ませ中',
  '仕上げ中',
];

// 泡の設定
const BUBBLE_CONFIG = [
  { size: 8, left: 20, delay: 0 },
  { size: 6, left: 45, delay: 300 },
  { size: 10, left: 70, delay: 600 },
  { size: 7, left: 35, delay: 900 },
  { size: 5, left: 60, delay: 1200 },
];

// 湯気の設定
const STEAM_CONFIG = [
  { left: 25, delay: 0 },
  { left: 50, delay: 400 },
  { left: 75, delay: 800 },
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
  const potShakeAnim = React.useRef(new Animated.Value(0)).current;
  const lidBounceAnim = React.useRef(new Animated.Value(0)).current;
  const [messageIndex, setMessageIndex] = React.useState(0);

  // 泡のアニメーション
  const bubbleAnims = React.useRef(
    BUBBLE_CONFIG.map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // 湯気のアニメーション
  const steamAnims = React.useRef(
    STEAM_CONFIG.map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

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

  // 鍋の揺れアニメーション
  React.useEffect(() => {
    if (!visible) return;

    const shakeAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(potShakeAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(potShakeAnim, {
          toValue: -1,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(potShakeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    shakeAnimation.start();
    return () => shakeAnimation.stop();
  }, [visible, potShakeAnim]);

  // 蓋のバウンスアニメーション
  React.useEffect(() => {
    if (!visible) return;

    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(lidBounceAnim, {
          toValue: -6,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lidBounceAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    );

    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, [visible, lidBounceAnim]);

  // 泡のアニメーション
  React.useEffect(() => {
    if (!visible) return;

    const bubbleAnimations = bubbleAnims.map((anim, index) => {
      const { delay } = BUBBLE_CONFIG[index];

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim.translateY, {
              toValue: -30,
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(anim.opacity, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    });

    bubbleAnimations.forEach((anim) => anim.start());
    return () => bubbleAnimations.forEach((anim) => anim.stop());
  }, [visible, bubbleAnims]);

  // 湯気のアニメーション
  React.useEffect(() => {
    if (!visible) return;

    const steamAnimations = steamAnims.map((anim, index) => {
      const { delay } = STEAM_CONFIG[index];

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim.translateY, {
              toValue: -25,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(anim.opacity, {
                toValue: 0.6,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 1200,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    });

    steamAnimations.forEach((anim) => anim.start());
    return () => steamAnimations.forEach((anim) => anim.stop());
  }, [visible, steamAnims]);

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

  // 鍋の揺れ補間
  const potRotate = potShakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2deg', '0deg', '2deg'],
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
          {/* 鍋コンテナ */}
          <View style={styles.potContainer}>
            {/* 湯気 */}
            <View style={styles.steamContainer}>
              {STEAM_CONFIG.map((config, index) => (
                <Animated.Text
                  key={`steam-${index}`}
                  style={[
                    styles.steam,
                    {
                      left: `${config.left}%`,
                      color: colors.mutedForeground,
                      opacity: steamAnims[index].opacity,
                      transform: [
                        { translateY: steamAnims[index].translateY },
                        { translateX: -6 },
                      ],
                    },
                  ]}
                >
                  ~
                </Animated.Text>
              ))}
            </View>

            {/* 蓋 */}
            <Animated.View
              style={[
                styles.lid,
                {
                  backgroundColor: '#8B7355',
                  transform: [{ translateY: lidBounceAnim }],
                },
              ]}
            >
              {/* 蓋の取っ手 */}
              <View style={[styles.lidHandle, { backgroundColor: '#6B5344' }]} />
              {/* 蓋のハイライト */}
              <View style={[styles.lidHighlight, { backgroundColor: '#A08B70' }]} />
            </Animated.View>

            {/* 鍋本体 */}
            <Animated.View
              style={[
                styles.pot,
                {
                  backgroundColor: '#6B4423',
                  transform: [{ rotate: potRotate }],
                },
              ]}
            >
              {/* 鍋の中身（スープ） */}
              <View style={[styles.potContent, { backgroundColor: colors.primary }]}>
                {/* 泡 */}
                {BUBBLE_CONFIG.map((config, index) => (
                  <Animated.View
                    key={`bubble-${index}`}
                    style={[
                      styles.bubble,
                      {
                        width: config.size,
                        height: config.size,
                        borderRadius: config.size / 2,
                        left: `${config.left}%`,
                        backgroundColor: `${colors.background}CC`,
                        opacity: bubbleAnims[index].opacity,
                        transform: [
                          { translateY: bubbleAnims[index].translateY },
                          { translateX: -config.size / 2 },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>

              {/* 鍋のハイライト */}
              <View style={[styles.potHighlight, { backgroundColor: '#8B6B43' }]} />

              {/* 鍋の取っ手（左） */}
              <View style={[styles.potHandleLeft, { backgroundColor: '#5B3413' }]} />
              {/* 鍋の取っ手（右） */}
              <View style={[styles.potHandleRight, { backgroundColor: '#5B3413' }]} />
            </Animated.View>
          </View>

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
            麹でじっくり調理中
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
  potContainer: {
    width: 120,
    height: 110,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  steamContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  steam: {
    position: 'absolute',
    fontSize: 18,
    fontWeight: '300',
    bottom: 0,
  },
  lid: {
    width: 80,
    height: 12,
    borderRadius: 6,
    marginBottom: -2,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lidHandle: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 8,
    borderRadius: 4,
  },
  lidHighlight: {
    position: 'absolute',
    top: 2,
    left: 8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.5,
  },
  pot: {
    width: 90,
    height: 55,
    borderRadius: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  potContent: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    height: 35,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bubble: {
    position: 'absolute',
    bottom: 5,
  },
  potHighlight: {
    position: 'absolute',
    left: 5,
    top: 8,
    width: 4,
    height: 30,
    borderRadius: 2,
    opacity: 0.4,
  },
  potHandleLeft: {
    position: 'absolute',
    left: -8,
    top: 20,
    width: 12,
    height: 8,
    borderRadius: 4,
  },
  potHandleRight: {
    position: 'absolute',
    right: -8,
    top: 20,
    width: 12,
    height: 8,
    borderRadius: 4,
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
