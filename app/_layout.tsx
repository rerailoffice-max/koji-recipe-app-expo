import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    // 端末側で起きている「Network request failed」の発生源を特定するためのグローバルハンドラ
    const runId = `global-err-${Date.now()}`;
    // #region agent log
    console.log('[DBG] install global error handlers', { runId });
    // #endregion

    const prevUnhandled = (globalThis as any).onunhandledrejection;
    (globalThis as any).onunhandledrejection = (event: any) => {
      // #region agent log
      console.log('[DBG] onunhandledrejection', {
        runId,
        reason: event?.reason?.message ?? String(event?.reason ?? 'unknown'),
      });
      // #endregion
      try {
        prevUnhandled?.(event);
      } catch {
        // ignore
      }
    };

    const ErrorUtilsAny = (globalThis as any).ErrorUtils;
    const prevHandler = ErrorUtilsAny?.getGlobalHandler?.();
    if (ErrorUtilsAny?.setGlobalHandler) {
      ErrorUtilsAny.setGlobalHandler((error: any, isFatal?: boolean) => {
        // #region agent log
        console.log('[DBG] globalError', {
          runId,
          isFatal: !!isFatal,
          message: error?.message ?? String(error),
          name: error?.name ?? null,
        });
        // #endregion
        try {
          prevHandler?.(error, isFatal);
        } catch {
          // ignore
        }
      });
    }

    return () => {
      (globalThis as any).onunhandledrejection = prevUnhandled;
      if (ErrorUtilsAny?.setGlobalHandler && prevHandler) {
        ErrorUtilsAny.setGlobalHandler(prevHandler);
      }
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="compose/edit" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
