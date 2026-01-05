import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

// WebBrowserのセッションを完了させる（iOS/Android）
WebBrowser.maybeCompleteAuthSession();

// 特徴アイコンのデータ
const FEATURES = [
  { id: 'fermented', icon: 'leaf', label: '発酵食品' },
  { id: 'ai', icon: 'sparkles', label: 'AI制作' },
  { id: 'safety', icon: 'shield', label: '安全管理' },
];

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);

  // 既存セッションをチェック
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // 既にログイン済みならホームへ
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/(tabs)');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Googleログイン
  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Web環境ではOAuth URLにリダイレクト
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.select({
            web: typeof window !== 'undefined' ? window.location.origin : undefined,
            default: 'kojirecipeappexpo://auth/callback',
          }),
        },
      });

      if (error) {
        console.error('Google login error:', error);
        alert('ログインに失敗しました。もう一度お試しください。');
        return;
      }

      // Web環境ではリダイレクトが自動で行われる
      if (Platform.OS === 'web' && data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Google login error:', e);
      alert('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // ゲストとして続行
  const handleGuestContinue = () => {
    router.replace('/(tabs)');
  };

  // リンクを開く
  const openLink = (path: string) => {
    Linking.openURL(`${API_BASE_URL}${path}`);
  };

  if (isCheckingSession) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}
    >
      {/* スペーサー上 */}
      <View style={styles.spacer} />

      {/* ロゴ・タイトル */}
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
          <IconSymbol name="leaf" size={40} color={colors.primaryForeground} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>GOCHISOKOJI</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          麹レシピを、AIと。
        </Text>
      </View>

      {/* 特徴アイコン */}
      <View style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature.id} style={styles.featureItem}>
            <View
              style={[
                styles.featureIconContainer,
                {
                  backgroundColor: `${colors.primary}20`,
                  borderColor: `${colors.primary}40`,
                },
              ]}
            >
              <IconSymbol name={feature.icon as any} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.featureLabel, { color: colors.text }]}>
              {feature.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ログインボタン */}
      <View style={styles.buttons}>
        <Pressable
          onPress={handleGoogleLogin}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.googleButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isLoading ? 0.8 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <GoogleIcon color={colors.primaryForeground} />
              <Text style={[styles.googleButtonText, { color: colors.primaryForeground }]}>
                Googleで続ける
              </Text>
            </>
          )}
        </Pressable>

        {/* 区切り線 */}
        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
            または
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <Pressable
          onPress={handleGuestContinue}
          style={({ pressed }) => [
            styles.guestButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.guestButtonText, { color: colors.text }]}>
            ログインせずに使う
          </Text>
        </Pressable>
      </View>

      {/* 法的リンク */}
      <View style={styles.legal}>
        <Text style={[styles.legalText, { color: colors.mutedForeground }]}>
          続けることで、
          <Text style={{ color: colors.primary }} onPress={() => openLink('/terms')}>
            利用規約
          </Text>
          および
          <Text style={{ color: colors.primary }} onPress={() => openLink('/privacy')}>
            プライバシーポリシー
          </Text>
          に同意したものとみなされます。
        </Text>
      </View>

      {/* スペーサー下 */}
      <View style={styles.spacer} />

      {/* 価値提案 */}
      <View
        style={[
          styles.valueProposition,
          {
            backgroundColor: `${colors.primary}15`,
            borderColor: `${colors.primary}30`,
          },
        ]}
      >
        <View
          style={[
            styles.valueIcon,
            { backgroundColor: `${colors.primary}25` },
          ]}
        >
          <IconSymbol name="thermometer" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.valueText, { color: colors.text }]}>
          AIは食品安全と温度管理のガイダンスも提供します
        </Text>
      </View>

      {/* フッター */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          © 2025 GOCHISOKOJI. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

// Googleアイコンコンポーネント
function GoogleIcon({ color }: { color: string }) {
  return (
    <View style={styles.googleIconContainer}>
      <Text style={{ color, fontSize: 18, fontWeight: '700' }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  spacer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  buttons: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    paddingHorizontal: Spacing.sm,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  legal: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  legalText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },
  valueProposition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  valueIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
  },
});
