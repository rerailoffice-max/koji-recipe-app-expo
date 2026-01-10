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

// 湯気の設定（縦線）
const STEAM_CONFIG = [
  { left: 30, delay: 0, height: 20 },
  { left: 50, delay: 300, height: 25 },
  { left: 70, delay: 600, height: 18 },
];

// キラキラの設定
const SPARKLE_CONFIG = [
  { top: 10, left: 15, delay: 0, size: 16 },
  { top: 25, left: 85, delay: 200, size: 14 },
  { top: 50, left: 10, delay: 400, size: 12 },
  { top: 60, left: 90, delay: 100, size: 18 },
  { top: 80, left: 20, delay: 300, size: 14 },
  { top: 75, left: 80, delay: 500, size: 16 },
];

export interface LoadingOverlayProps {
  visible: boolean;
  /** カスタムメッセージ（指定しない場合は自動切り替え） */
  message?: string;
  /** 完成状態 */
  isComplete?: boolean;
  /** 完成演出後のコールバック */
  onCompleteEnd?: () => void;
}

export function LoadingOverlay({ visible, message, isComplete, onCompleteEnd }: LoadingOverlayProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // アニメーション用の値
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const potShakeAnim = React.useRef(new Animated.Value(0)).current;
  const lidBounceAnim = React.useRef(new Animated.Value(0)).current;
  const [messageIndex, setMessageIndex] = React.useState(0);

  // 完成アニメーション用
  const completeScaleAnim = React.useRef(new Animated.Value(0)).current;
  const completeFadeAnim = React.useRef(new Animated.Value(0)).current;

  // 泡のアニメーション
  const bubbleAnims = React.useRef(
    BUBBLE_CONFIG.map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  // 湯気のアニメーション（縦線用）
  const steamAnims = React.useRef(
    STEAM_CONFIG.map(() => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scaleY: new Animated.Value(0.5),
    }))
  ).current;

  // キラキラのアニメーション
  const sparkleAnims = React.useRef(
    SPARKLE_CONFIG.map(() => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // 表示/非表示アニメーション
  React.useEffect(() => {
    if (visible) {
      setMessageIndex(0);
      completeScaleAnim.setValue(0);
      completeFadeAnim.setValue(0);
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
  }, [visible, fadeAnim, scaleAnim, completeScaleAnim, completeFadeAnim]);

  // 完成アニメーション
  React.useEffect(() => {
    if (!visible || !isComplete) return;

    Animated.parallel([
      Animated.spring(completeScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(completeFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // 完成演出後にコールバック
    if (onCompleteEnd) {
      const timer = setTimeout(() => {
        onCompleteEnd();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [visible, isComplete, completeScaleAnim, completeFadeAnim, onCompleteEnd]);

  // キラキラアニメーション（完成時のみ）
  React.useEffect(() => {
    if (!visible || !isComplete) return;

    const sparkleAnimations = sparkleAnims.map((anim, index) => {
      const { delay } = SPARKLE_CONFIG[index];

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(anim.scale, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(anim.scale, {
                toValue: 0,
                duration: 300,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(anim.rotate, {
              toValue: 1,
              duration: 600,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(anim.rotate, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.delay(200),
        ])
      );
    });

    sparkleAnimations.forEach((anim) => anim.start());
    return () => sparkleAnimations.forEach((anim) => anim.stop());
  }, [visible, isComplete, sparkleAnims]);

  // 鍋の揺れアニメーション
  React.useEffect(() => {
    if (!visible || isComplete) return;

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
  }, [visible, isComplete, potShakeAnim]);

  // 蓋のバウンスアニメーション
  React.useEffect(() => {
    if (!visible || isComplete) return;

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
  }, [visible, isComplete, lidBounceAnim]);

  // 泡のアニメーション
  React.useEffect(() => {
    if (!visible || isComplete) return;

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
  }, [visible, isComplete, bubbleAnims]);

  // 湯気のアニメーション（上向きの縦線）
  React.useEffect(() => {
    if (!visible || isComplete) return;

    const steamAnimations = steamAnims.map((anim, index) => {
      const { delay } = STEAM_CONFIG[index];

      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            // 上昇
            Animated.timing(anim.translateY, {
              toValue: -30,
              duration: 1800,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            // 左右に揺れる
            Animated.sequence([
              Animated.timing(anim.translateX, {
                toValue: 3,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(anim.translateX, {
                toValue: -3,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(anim.translateX, {
                toValue: 0,
                duration: 600,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            // 伸びる
            Animated.timing(anim.scaleY, {
              toValue: 1.5,
              duration: 1000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            // フェードイン/アウト
            Animated.sequence([
              Animated.timing(anim.opacity, {
                toValue: 0.7,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 0,
                duration: 1400,
                useNativeDriver: true,
              }),
            ]),
          ]),
          // リセット
          Animated.parallel([
            Animated.timing(anim.translateY, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateX, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(anim.scaleY, {
              toValue: 0.5,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    steamAnimations.forEach((anim) => anim.start());
    return () => steamAnimations.forEach((anim) => anim.stop());
  }, [visible, isComplete, steamAnims]);

  // メッセージ切り替え
  React.useEffect(() => {
    if (!visible || message || isComplete) return;

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        if (prev >= LOADING_MESSAGES.length - 1) return prev;
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [visible, message, isComplete]);

  // 鍋の揺れ補間
  const potRotate = potShakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-2deg', '0deg', '2deg'],
  });

  const currentMessage = isComplete ? 'できましたよ！' : (message || LOADING_MESSAGES[messageIndex]);

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
          {/* 完成時のキラキラ */}
          {isComplete && (
            <View style={styles.sparkleContainer}>
              {SPARKLE_CONFIG.map((config, index) => {
                const rotate = sparkleAnims[index].rotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                });
                return (
                  <Animated.Text
                    key={`sparkle-${index}`}
                    style={[
                      styles.sparkle,
                      {
                        top: `${config.top}%`,
                        left: `${config.left}%`,
                        fontSize: config.size,
                        opacity: sparkleAnims[index].opacity,
                        transform: [
                          { scale: sparkleAnims[index].scale },
                          { rotate },
                        ],
                      },
                    ]}
                  >
                    ✨
                  </Animated.Text>
                );
              })}
            </View>
          )}

          {/* 鍋コンテナ or 完成アイコン */}
          {isComplete ? (
            <Animated.View
              style={[
                styles.completeContainer,
                {
                  opacity: completeFadeAnim,
                  transform: [{ scale: completeScaleAnim }],
                },
              ]}
            >
              <Text style={styles.completeEmoji}>🍽️</Text>
            </Animated.View>
          ) : (
            <View style={styles.potContainer}>
              {/* 湯気（上向きの縦線） */}
              <View style={styles.steamContainer}>
                {STEAM_CONFIG.map((config, index) => (
                  <Animated.View
                    key={`steam-${index}`}
                    style={[
                      styles.steamLine,
                      {
                        left: `${config.left}%`,
                        height: config.height,
                        backgroundColor: colors.mutedForeground,
                        opacity: steamAnims[index].opacity,
                        transform: [
                          { translateY: steamAnims[index].translateY },
                          { translateX: steamAnims[index].translateX },
                          { scaleY: steamAnims[index].scaleY },
                        ],
                      },
                    ]}
                  />
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
          )}

          {/* メッセージ */}
          <Text style={[styles.message, { color: colors.text }]}>
            {currentMessage}{!isComplete && '...'}
          </Text>

          {/* プログレスドット（完成時は非表示） */}
          {!isComplete && (
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
          )}

          {/* サブテキスト */}
          <Text style={[styles.subText, { color: colors.mutedForeground }]}>
            {isComplete ? '編集画面に移動します' : '麹でじっくり調理中'}
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
    position: 'relative',
    overflow: 'hidden',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  sparkle: {
    position: 'absolute',
  },
  potContainer: {
    width: 120,
    height: 110,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  completeContainer: {
    width: 120,
    height: 110,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeEmoji: {
    fontSize: 64,
  },
  steamContainer: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 35,
  },
  steamLine: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    borderRadius: 2,
    marginLeft: -1.5,
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
