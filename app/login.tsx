import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, API_BASE_URL, SUPABASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

// WebBrowserのセッションを完了させる（iOS/Android）
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const LOG_URL = 'http://127.0.0.1:7244/ingest/a2183a97-7691-4013-9b1b-c6f1b8ad2750';
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);
  const [isEmailLogin, setIsEmailLogin] = React.useState(false);
  const [isSignup, setIsSignup] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorText, setErrorText] = React.useState('');

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
    setErrorText('');

    // #region agent log - H3: リダイレクトURL確認
    console.log('[DEBUG H3] redirectUrl:', redirectUrl);
    console.log('[DEBUG H3] Platform.OS:', Platform.OS);
    // #endregion

    try {
      if (Platform.OS === 'web') {
        // Web: 直接OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
          },
        });

        // #region agent log - H2: OAuth URL確認 (Web)
        console.log('[DEBUG H2 Web] data:', JSON.stringify(data));
        console.log('[DEBUG H2 Web] error:', error);
        // #endregion

        if (error) throw error;
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        // Native (Expo Go): WebBrowserでOAuthを開く
        // #region agent log - H2: OAuth呼び出し前
        console.log('[DEBUG H2 Native] Calling signInWithOAuth with redirectUrl:', redirectUrl);
        // #endregion

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        // #region agent log - H2: OAuth結果確認
        console.log('[DEBUG H2 Native] OAuth data.url:', data?.url);
        console.log('[DEBUG H2 Native] OAuth error:', error?.message);
        // #endregion

        if (error) {
          // #region agent log - H2: OAuthエラー詳細
          setErrorText(`Googleログインに失敗しました: ${error.message}`);
          // #endregion
          throw error;
        }

        if (data.url) {
          // #region agent log - H4: WebBrowser呼び出し前
          console.log('[DEBUG H4] Opening WebBrowser with URL:', data.url.substring(0, 100) + '...');
          // #endregion

          // #region agent log
          fetch(LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: `oauth-native-${Date.now()}`,
              hypothesisId: 'H4_open',
              location: 'app/login.tsx:handleGoogleLogin',
              message: 'openAuthSessionAsync start',
              data: { redirectUrl, urlHost: (() => { try { return new URL(data.url).host; } catch { return null; } })() },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          // WebBrowserで認証ページを開く
          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
            {
              showInRecents: true,
              preferEphemeralSession: false,
            }
          );

          // #region agent log - H4: WebBrowser結果
          console.log('[DEBUG H4] WebBrowser result type:', result.type);
          if (result.type === 'success') {
            console.log('[DEBUG H4] WebBrowser result url:', (result as any).url?.substring(0, 100));
          }
          // #endregion

          if (result.type === 'success' && result.url) {
            // 成功したらアプリ内の /auth/callback へ委譲（code交換はそちらで）
            router.replace('/auth/callback');
          } else if (result.type === 'cancel') {
            // #region agent log - H4: キャンセル
            console.log('[DEBUG H4] User cancelled auth');
            // #endregion
          } else if (result.type === 'dismiss') {
            // #region agent log - H4: ディスミス
            console.log('[DEBUG H4] Auth dismissed');
            // #endregion
          }
        } else {
          // #region agent log - H2: URLなし
          setErrorText('Googleログインの開始に失敗しました（URLが取得できません）');
          // #endregion
        }
      }
    } catch (e: any) {
      // #region agent log - H1/H5: エラー詳細
      console.error('[DEBUG ERROR] Google login error:', e);
      if (!errorText) setErrorText(e?.message ? `ログインに失敗しました: ${e.message}` : 'ログインに失敗しました');
      // #endregion
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = () => {
    setErrorText('');
    setIsEmailLogin(true);
    setIsSignup(false);
  };

  const handleSignup = () => {
    setErrorText('');
    setIsEmailLogin(true);
    setIsSignup(true);
  };

  // ゲストとして続行
  const handleGuestContinue = () => {
    router.replace('/(tabs)');
  };

  // リンクを開く
  const openLink = (path: string) => {
    Linking.openURL(`${API_BASE_URL}${path}`);
  };

  const handleEmailSubmit = async () => {
    if (isLoading) return;
    setErrorText('');
    if (!email.trim() || !password) {
      setErrorText('メールアドレスとパスワードを入力してください。');
      return;
    }
    setIsLoading(true);
    try {
      const runId = `email-login-${Date.now()}`;
      const trimmedEmail = email.trim();

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:start',message:'H1:認証開始',data:{mode:isSignup?'signup':'login',emailLen:trimmedEmail.length,apiBaseUrl:API_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      // Vercel API経由でSupabaseに認証（Supabase直接接続を回避）
      const endpoint = isSignup
        ? `${API_BASE_URL}/api/auth/email-signup`
        : `${API_BASE_URL}/api/auth/email-login`;

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:beforeFetch',message:'H2:API呼び出し前',data:{endpoint},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:afterFetch',message:'H2:API呼び出し後',data:{status:res.status,statusText:res.statusText,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      const text = await res.text();

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:responseText',message:'H3:レスポンステキスト',data:{textLength:text.length,textPreview:text.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr: any) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:parseError',message:'H3:JSONパース失敗',data:{parseError:parseErr?.message,text:text.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        setErrorText('サーバーからの応答が正しくありません。');
        return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:parsed',message:'H4:パース成功',data:{success:json.success,hasSession:!!json.session,error:json.error,debug:json.debug},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      if (!json.success) {
        setErrorText(json.error || '認証に失敗しました。');
        return;
      }

      // 新規登録で確認メール送信が必要な場合
      if (isSignup && json.needsEmailConfirmation) {
        setErrorText(json.message || '確認メールを送信しました。メールのリンクを開いてからログインしてください。');
        return;
      }

      // セッションをSupabase clientにセット
      if (json.session?.access_token && json.session?.refresh_token) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:setSession',message:'H5:セッション設定開始',data:{hasAccessToken:!!json.session.access_token,hasRefreshToken:!!json.session.refresh_token},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H5'})}).catch(()=>{});
        // #endregion

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        });

        if (sessionError) {
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:setSessionError',message:'H5:セッション設定失敗',data:{error:sessionError.message},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          setErrorText('セッションの設定に失敗しました。');
          return;
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:success',message:'認証成功',data:{navigatingTo:'/(tabs)'},timestamp:Date.now(),sessionId:'debug-session',runId,hypothesisId:'SUCCESS'})}).catch(()=>{});
      // #endregion

      router.replace('/(tabs)');
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login.tsx:handleEmailSubmit:catchError',message:'H1:通信エラー',data:{error:e?.message??String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'error',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      setErrorText(e?.message ? `通信に失敗しました: ${e.message}` : '通信に失敗しました。');
    } finally {
      setIsLoading(false);
    }
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
        {errorText ? (
          <View style={[styles.errorBox, { borderColor: `${colors.primary}33`, backgroundColor: `${colors.primary}0D` }]}>
            <Text style={[styles.errorText, { color: colors.text }]}>{errorText}</Text>
          </View>
        ) : null}

        {isEmailLogin ? (
          <>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>メールアドレス</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="example@email.com"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>パスワード</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="パスワードを入力"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.passwordInput, { color: colors.text }]}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                  <IconSymbol name={showPassword ? 'eye.slash' : 'eye'} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={() => void handleEmailSubmit()}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>{isSignup ? '新規登録' : 'ログイン'}</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setIsEmailLogin(false)} style={styles.backLink}>
              <Text style={[styles.guestText, { color: colors.mutedForeground }]}>← 戻る</Text>
            </Pressable>
          </>
        ) : (
          <>
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
          </>
        )}
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
  errorBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
  },
  passwordRow: {
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    paddingRight: Spacing.sm,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
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
