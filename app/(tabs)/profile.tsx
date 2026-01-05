import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">プロフィール</ThemedText>
        <ThemedText type="default" style={styles.sub}>
          ここは最小UI（後で設定/ログアウト等を移植します）
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { gap: 6 },
  sub: { opacity: 0.7 },
});


