import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LOG_URL = 'http://127.0.0.1:7244/ingest/a2183a97-7691-4013-9b1b-c6f1b8ad2750';

export default function AuthCallbackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const params = useLocalSearchParams();

  React.useEffect(() => {
    const runId = `auth-callback-${Date.now()}`;

    // #region agent log
    fetch(LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId,
        hypothesisId: 'H_cb_entry',
        location: 'app/auth/callback.tsx:effect',
        message: 'auth callback entry',
        data: {
          platform: Platform.OS,
          hasCode: typeof params?.code === 'string' && (params.code as string).length > 0,
          hasError: typeof params?.error === 'string' && (params.error as string).length > 0,
          error: typeof params?.error === 'string' ? params.error : null,
          errorDescription:
            typeof params?.error_description === 'string' ? (params.error_description as string).slice(0, 80) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const run = async () => {
      try {
        const error = typeof params?.error === 'string' ? (params.error as string) : null;
        const errorDescription =
          typeof params?.error_description === 'string' ? (params.error_description as string) : null;
        if (error) {
          // #region agent log
          fetch(LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId,
              hypothesisId: 'H_cb_error',
              location: 'app/auth/callback.tsx:run',
              message: 'auth callback has error param',
              data: { error, errorDescription: errorDescription?.slice(0, 120) ?? null },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          return;
        }

        const code = typeof params?.code === 'string' ? (params.code as string) : null;
        if (code) {
          // #region agent log
          fetch(LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId,
              hypothesisId: 'H_cb_exchange',
              location: 'app/auth/callback.tsx:run',
              message: 'exchangeCodeForSession start',
              data: { codeLen: code.length },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);

          // #region agent log
          fetch(LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId,
              hypothesisId: 'H_cb_exchange',
              location: 'app/auth/callback.tsx:run',
              message: 'exchangeCodeForSession done',
              data: { ok: !exErr, error: exErr?.message ?? null },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        }

        // セッション取得できたらホームへ
        const { data } = await supabase.auth.getSession();
        const hasSession = !!data?.session;

        // #region agent log
        fetch(LOG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId,
            hypothesisId: 'H_cb_done',
            location: 'app/auth/callback.tsx:run',
            message: 'auth callback session check',
            data: { hasSession },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        if (hasSession) router.replace('/(tabs)');
      } catch (e: any) {
        // #region agent log
        fetch(LOG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId,
            hypothesisId: 'H_cb_exception',
            location: 'app/auth/callback.tsx:run',
            message: 'auth callback exception',
            data: { message: e?.message ?? String(e) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
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




