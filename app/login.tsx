import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">ログイン</ThemedText>
        <ThemedText type="default" style={styles.sub}>
          ここは最小UIです（後でSupabaseログインを移植します）
        </ThemedText>
      </View>

      <Pressable
        onPress={() => router.replace('/')}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="ログインせずに続ける"
      >
        <ThemedText type="defaultSemiBold" style={styles.buttonText}>
          とりあえず使ってみる
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  header: { gap: 6, marginBottom: 20 },
  sub: { opacity: 0.7 },
  button: {
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#c3923a',
  },
  buttonText: { color: '#ffffff' },
});


