import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ComposeScreen() {
  const [text, setText] = React.useState('');

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">レシピを考える</ThemedText>
        <ThemedText type="default" style={styles.sub}>
          ここは最小UI（後で今のNext.js版のチャットUIを移植します）
        </ThemedText>
      </View>

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="料理名やメモ（例：肉まん）"
          style={styles.input}
          multiline
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 12, gap: 6 },
  sub: { opacity: 0.7 },
  composer: {
    borderWidth: 1,
    borderColor: 'rgba(195, 146, 58, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  input: { minHeight: 44, fontSize: 16 },
});


