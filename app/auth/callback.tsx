import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase, getPendingRecipe } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthCallbackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const params = useLocalSearchParams();

  React.useEffect(() => {
    const run = async () => {
      try {
        const error = typeof params?.error === 'string' ? (params.error as string) : null;
        const errorDescription =
          typeof params?.error_description === 'string' ? (params.error_description as string) : null;
        if (error) {
          return;
        }

        const code = typeof params?.code === 'string' ? (params.code as string) : null;
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          // exchangeエラーはこの画面では握りつぶし（ログイン画面側で再試行/案内）
          void exErr;
        }

        // セッション取得できたらホームへ（Webでは /(tabs) より / の方が確実）
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data?.session;
        const { data: userData } = await supabase.auth.getUser();
        const hasUser = !!userData?.user;

        // Googleログイン後に posts.user_id のFKを満たすため、public.users を作成/更新
        if (userData?.user?.id) {
          try {
            // まずは行を確実に作る（FK対策）
            await supabase
              .from('users')
              .upsert({ id: userData.user.id, email: userData.user.email ?? null }, { onConflict: 'id' });

            // 表示名/アイコンは Auth の user_metadata から補完（ユーザーが手動で設定した値は上書きしない）
            const meta: any = userData.user.user_metadata ?? {};
            const derivedDisplayName: string | null =
              (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
              (typeof meta.name === 'string' && meta.name.trim()) ||
              (typeof meta.preferred_username === 'string' && meta.preferred_username.trim()) ||
              null;
            const derivedAvatarUrl: string | null =
              (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
              (typeof meta.picture === 'string' && meta.picture.trim()) ||
              null;

            const { data: existing, error: existingErr }: any = await supabase
              .from('users')
              .select('display_name, avatar_url')
              .eq('id', userData.user.id)
              .single();

            // 0件（PGRST116）は「未作成」扱い（直前upsert後なので基本起きないが保険）
            if (!existingErr || existingErr?.code === 'PGRST116') {
              const next: any = {};
              if (derivedDisplayName && !(existing?.display_name && String(existing.display_name).trim())) {
                next.display_name = derivedDisplayName;
              }
              if (derivedAvatarUrl && !(existing?.avatar_url && String(existing.avatar_url).trim())) {
                next.avatar_url = derivedAvatarUrl;
              }
              if (Object.keys(next).length > 0) {
                await supabase.from('users').update(next).eq('id', userData.user.id);
              }
            }
          } catch (e) {
            // ignore
          }
        }

        if (hasSession || hasUser) {
          // ログイン成功後、保留レシピをチェック
          const pending = await getPendingRecipe();
          if (pending) {
            // 保留レシピがあればlogin画面へ（モーダル表示のため）
            router.replace('/login?pending=1');
          } else {
            router.replace('/');
          }
        }
      } catch (e: any) {
        // ignore
      }
    };

    void run();
  }, [params, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>ログイン処理中…</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>少し待ってね</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  card: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.lg },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { fontSize: 12 },
});




