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
  Modal,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, API_BASE_URL, SUPABASE_URL, getPendingRecipe, clearPendingRecipe, type PendingRecipe } from '@/lib/supabase';
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
  const params = useLocalSearchParams();
  
  // URLパラメータから保留レシピフラグを取得
  const hasPendingParam = params?.pending === '1';

  const [isLoading, setIsLoading] = React.useState(false);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);
  const [isEmailLogin, setIsEmailLogin] = React.useState(false);
  const [isSignup, setIsSignup] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorText, setErrorText] = React.useState('');
  
  // 保留レシピ関連の状態
  const [pendingRecipe, setPendingRecipe] = React.useState<PendingRecipe | null>(null);
  const [showPendingRecipeModal, setShowPendingRecipeModal] = React.useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = React.useState(false);

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
          // pending=1パラメータがある場合は保留レシピをチェック
          if (hasPendingParam) {
            const pending = await getPendingRecipe();
            if (pending) {
              setPendingRecipe(pending);
              setShowPendingRecipeModal(true);
              setIsCheckingSession(false);
              return;
            }
          }
          router.replace('/');
        }
      } catch (e) {
        console.error('Session check error:', e);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // ログイン成功時、保留レシピをチェック
        const pending = await getPendingRecipe();
        if (pending) {
          setPendingRecipe(pending);
          setShowPendingRecipeModal(true);
        } else {
          router.replace('/');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Googleログイン
  const handleGoogleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorText('');

    try {
      if (Platform.OS === 'web') {
        // Web: 直接OAuth
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
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

        if (error) {
          setErrorText(`Googleログインに失敗しました: ${error.message}`);
          throw error;
        }

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
            // 成功したらアプリ内の /auth/callback へ委譲（code交換はそちらで）
            router.replace('/auth/callback');
          }
        } else {
          setErrorText('Googleログインの開始に失敗しました（URLが取得できません）');
        }
      }
    } catch (e: any) {
      console.error('Google login error:', e);
      if (!errorText) setErrorText(e?.message ? `ログインに失敗しました: ${e.message}` : 'ログインに失敗しました');
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
  
  // 保留レシピを下書きに保存
  const handleSavePendingRecipe = async () => {
    if (!pendingRecipe || isSavingRecipe) return;
    
    setIsSavingRecipe(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorText('ユーザー情報の取得に失敗しました');
        return;
      }
      
      // 下書きとしてDBに保存
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        title: pendingRecipe.title,
        description: pendingRecipe.description,
        koji_type: pendingRecipe.koji_type,
        difficulty: pendingRecipe.difficulty,
        ingredients: JSON.parse(pendingRecipe.ingredients || '[]'),
        steps: JSON.parse(pendingRecipe.steps || '[]'),
        tips: pendingRecipe.tips || '',
        calories: pendingRecipe.calories ? parseInt(pendingRecipe.calories, 10) : null,
        salt_g: pendingRecipe.salt_g ? parseFloat(pendingRecipe.salt_g) : null,
        cooking_time_min: pendingRecipe.cooking_time_min ? parseInt(pendingRecipe.cooking_time_min, 10) : null,
        tags: JSON.parse(pendingRecipe.tags || '[]'),
        is_public: false, // 下書き
      });
      
      if (error) {
        console.error('Failed to save pending recipe:', error);
        setErrorText('下書きの保存に失敗しました');
        return;
      }
      
      // LocalStorageをクリア
      await clearPendingRecipe();
      
      // モーダルを閉じて遷移
      setShowPendingRecipeModal(false);
      setPendingRecipe(null);
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Save pending recipe error:', e);
      setErrorText('下書きの保存に失敗しました');
    } finally {
      setIsSavingRecipe(false);
    }
  };

  // 保留レシピを編集画面で開く（DB保存は編集画面で行う）
  const handleOpenPendingRecipe = async () => {
    if (!pendingRecipe || isSavingRecipe) return;

    setIsSavingRecipe(true);
    try {
      const p = pendingRecipe;
      // ループ表示防止のため、先にクリア
      await clearPendingRecipe();
      setShowPendingRecipeModal(false);
      setPendingRecipe(null);

      router.replace({
        pathname: '/compose/edit',
        params: {
          title: p.title || '',
          description: p.description || '',
          koji_type: p.koji_type || '',
          difficulty: p.difficulty || 'かんたん',
          ingredients: p.ingredients || '[]',
          steps: p.steps || '[]',
          tips: p.tips || '',
          image_base64: p.image_base64 || '',
          calories: p.calories || '',
          salt_g: p.salt_g || '',
          cooking_time_min: p.cooking_time_min || '',
          tags: p.tags || '[]',
        },
      } as any);
    } catch (e) {
      console.error('Open pending recipe error:', e);
      setErrorText('編集画面の起動に失敗しました');
    } finally {
      setIsSavingRecipe(false);
    }
  };
  
  // 保留レシピを破棄
  const handleDiscardPendingRecipe = async () => {
    await clearPendingRecipe();
    setShowPendingRecipeModal(false);
    setPendingRecipe(null);
    router.replace('/(tabs)');
  };

  // リンクを開く（設定画面と同じくアプリ内ページへ）
  const openLink = (path: string) => {
    router.push(path as any);
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
      const trimmedEmail = email.trim();

      // Vercel API経由でSupabaseに認証（Supabase直接接続を回避）
      const endpoint = isSignup
        ? `${API_BASE_URL}/api/auth/email-signup`
        : `${API_BASE_URL}/api/auth/email-login`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const text = await res.text();

      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr: any) {
        setErrorText('サーバーからの応答が正しくありません。');
        return;
      }

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
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: json.session.access_token,
          refresh_token: json.session.refresh_token,
        });

        if (sessionError) {
          setErrorText('セッションの設定に失敗しました。');
          return;
        }
      }

      // public.users にプロフィール行を作成/更新（posts.user_id のFKと埋め込みのため）
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { error: upsertErr } = await supabase
            .from('users')
            .upsert(
              {
                id: user.id,
                email: user.email ?? trimmedEmail,
              },
              { onConflict: 'id' }
            );
          if (upsertErr) {
            console.warn('Profile upsert failed:', upsertErr);
          }
        }
      } catch (profileErr) {
        console.warn('Profile upsert exception:', profileErr);
      }

      // ログイン成功後、保留レシピをチェック
      const pending = await getPendingRecipe();
      if (pending) {
        setPendingRecipe(pending);
        setShowPendingRecipeModal(true);
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      const apiUrl = `${API_BASE_URL}/api/auth/${isSignup ? 'email-signup' : 'email-login'}`;
      console.error('Login error:', e, 'API URL:', apiUrl);
      setErrorText(e?.message ? `通信に失敗しました: ${e.message}\n接続先: ${apiUrl}` : '通信に失敗しました。');
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
        <View style={[styles.logoContainer, { backgroundColor: 'transparent' }]}>
          {Platform.OS === 'web' ? (
            <img
              src="/login-logo.png"
              alt="GOCHISOKOJI"
              style={{ width: 88, height: 88, borderRadius: 20 }}
            />
          ) : (
            <IconSymbol name="leaf" size={48} color="#ffffff" />
          )}
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
            {/* 新規登録の場合はGoogleボタンも表示 */}
            {isSignup && (
              <>
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
                      <Text style={styles.primaryButtonText}>Googleで新規登録</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
                    または
                  </Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>
              </>
            )}

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
          © 2026 GOCHISOKOJI. All rights reserved.
        </Text>
      </View>

      {/* 保留レシピ確認モーダル */}
      <Modal
        visible={showPendingRecipeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalLogoWrap,
                  {
                    backgroundColor: `${colors.primary}10`,
                    borderColor: `${colors.primary}20`,
                  },
                ]}
              >
                {Platform.OS === 'web' ? (
                  <img
                    src="/login-logo.png"
                    alt="GOCHISOKOJI"
                    style={{ width: 40, height: 40, borderRadius: 12 }}
                  />
                ) : (
                  <Image
                    source={require('../assets/images/icon.png')}
                    style={styles.modalLogoImage}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                前回のメニューがあります
              </Text>
            </View>
            
            {pendingRecipe && (
              <View style={[styles.recipePreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
                  {pendingRecipe.title || '（タイトルなし）'}
                </Text>
                {pendingRecipe.description && (
                  <Text style={[styles.recipeDescription, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {pendingRecipe.description}
                  </Text>
                )}
                <View style={styles.recipeMeta}>
                  {pendingRecipe.koji_type && (
                    <Text style={[styles.recipeMetaText, { color: colors.primary }]}>
                      🍶 {pendingRecipe.koji_type}
                    </Text>
                  )}
                  {pendingRecipe.cooking_time_min && (
                    <Text style={[styles.recipeMetaText, { color: colors.mutedForeground }]}>
                      ⏱ {pendingRecipe.cooking_time_min}分
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            <Text style={[styles.modalMessage, { color: colors.mutedForeground }]}>
              ログイン前に作成したメニューです。{'\n'}
              編集画面に移動して内容を確認しますか？
            </Text>
            
            <View style={styles.modalButtons}>
              <Pressable
                onPress={handleOpenPendingRecipe}
                disabled={isSavingRecipe}
                style={({ pressed }) => [
                  styles.modalPrimaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed || isSavingRecipe ? 0.8 : 1,
                  },
                ]}
              >
                {isSavingRecipe ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalPrimaryButtonText}>編集画面へ</Text>
                )}
              </Pressable>
              
              <Pressable
                onPress={handleDiscardPendingRecipe}
                disabled={isSavingRecipe}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.modalSecondaryButtonText, { color: colors.mutedForeground }]}>
                  破棄する
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  // 保留レシピモーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  recipePreview: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  recipeDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  recipeMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    gap: Spacing.sm,
  },
  modalPrimaryButton: {
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalSecondaryButton: {
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
  },
});
