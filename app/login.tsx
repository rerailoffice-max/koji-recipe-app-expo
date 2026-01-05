import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

// WebBrowserのセッションを完了させる（iOS/Android）
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);

  // Expo用のリダイレクトURL
  const redirectUrl = AuthSession.makeRedirectUri({
    scheme: 'kojirecipeappexpo',
    path: 'auth/callback',
  });

  // 既存セッションをチェック
  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
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
      if (Platform.OS === 'web') {
        // Web: 直接OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });

        if (error) throw error;
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        // Native (Expo Go): WebBrowserでOAuthを開く
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) throw error;

        if (data.url) {
          // WebBrowserで認証ページを開く
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
            {
              showInRecents: true,
              preferEphemeralSession: false,
            }
          );

          if (result.type === 'success' && result.url) {
            // URLからトークンを抽出
            const url = new URL(result.url);
            const params = new URLSearchParams(url.hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              // セッションを設定
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) throw sessionError;
            }
          }
        }
      }
    } catch (e) {
      console.error('Google login error:', e);
      alert('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // メールログイン（将来実装）
  const handleEmailLogin = () => {
    alert('メールログインは現在準備中です。\nGoogleでログインするか、ログインせずにお使いください。');
  };

  // 新規登録（将来実装）
  const handleSignup = () => {
    alert('新規登録は現在準備中です。\nGoogleでログインするか、ログインせずにお使いください。');
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
          <IconSymbol name="leaf" size={48} color="#ffffff" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>GOCHISOKOJI</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          麹レシピを、AIと。
        </Text>
      </View>

      {/* 特徴アイコン */}
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureIconContainer,
              {
                backgroundColor: `${colors.primary}15`,
                borderColor: `${colors.primary}25`,
              },
            ]}
          >
            <IconSymbol name="leaf" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.featureLabel, { color: colors.text }]}>発酵食品</Text>
        </View>

        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureIconContainer,
              {
                backgroundColor: `${colors.primary}20`,
                borderColor: `${colors.primary}30`,
              },
            ]}
          >
            <IconSymbol name="sparkles" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.featureLabel, { color: colors.text }]}>AI制作</Text>
        </View>

        <View style={styles.featureItem}>
          <View
            style={[
              styles.featureIconContainer,
              {
                backgroundColor: `${colors.primary}25`,
                borderColor: `${colors.primary}35`,
              },
            ]}
          >
            <IconSymbol name="shield" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.featureLabel, { color: colors.text }]}>安全管理</Text>
        </View>
      </View>

      {/* ログインボタン */}
      <View style={styles.buttons}>
        {/* Googleログイン（プライマリ） */}
        <Pressable
          onPress={handleGoogleLogin}
          disabled={isLoading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed || isLoading ? 0.8 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.primaryButtonText}>Googleで続ける</Text>
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

        {/* メールログイン（セカンダリ/枠線） */}
        <Pressable
          onPress={handleEmailLogin}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <IconSymbol name="envelope" size={20} color={colors.text} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            メールアドレスでログイン
          </Text>
        </Pressable>

        {/* 新規登録・ログインせずに使うリンク */}
        <View style={styles.linksContainer}>
          <View style={styles.signupRow}>
            <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
              アカウントをお持ちでない方は{' '}
            </Text>
            <Pressable onPress={handleSignup}>
              <Text style={[styles.linkHighlight, { color: colors.primary }]}>新規登録</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleGuestContinue} style={styles.guestRow}>
            <Text style={[styles.guestText, { color: colors.mutedForeground }]}>
              ログインせずに使う
            </Text>
          </Pressable>
        </View>
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
          に{'\n'}同意したものとみなされます。
        </Text>
      </View>

      {/* スペーサー下 */}
      <View style={styles.spacer} />

      {/* 価値提案 */}
      <View
        style={[
          styles.valueProposition,
          {
            backgroundColor: `${colors.primary}10`,
            borderColor: `${colors.primary}20`,
          },
        ]}
      >
        <View
          style={[
            styles.valueIcon,
            { backgroundColor: `${colors.primary}20` },
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
          © 2024 GOCHISOKOJI. All rights reserved.
        </Text>
      </View>
    </View>
  );
}

// Googleアイコン
function GoogleIcon() {
  return (
    <View style={styles.googleIconContainer}>
      <Text style={styles.googleIconText}>G</Text>
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
    width: 88,
    height: 88,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 17,
    letterSpacing: 2,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  featureLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  buttons: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
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
    paddingHorizontal: Spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  linksContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
  linkHighlight: {
    fontSize: 14,
    fontWeight: '600',
  },
  guestRow: {
    paddingVertical: Spacing.xs,
  },
  guestText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legal: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  valueProposition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 4,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
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
