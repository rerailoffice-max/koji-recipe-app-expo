import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { User } from '@supabase/supabase-js';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: number }[] = [
  { value: 'small', label: '小', size: 14 },
  { value: 'medium', label: '中', size: 16 },
  { value: 'large', label: '大', size: 18 },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [fontSize, setFontSize] = React.useState<FontSize>('medium');

  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AppBar */}
      <AppBar
        title="設定"
        leftAction={
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        {/* アカウント情報 */}
        {user && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>アカウント</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>メールアドレス</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
            </View>
          </View>
        )}

        {/* 表示設定 */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>表示設定</Text>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>文字の大きさ</Text>
            <View style={styles.fontSizeOptions}>
              {FONT_SIZE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setFontSize(option.value)}
                  style={[
                    styles.fontSizeOption,
                    {
                      backgroundColor: fontSize === option.value ? colors.primary : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.fontSizeOptionText,
                      {
                        color: fontSize === option.value ? colors.primaryForeground : colors.text,
                        fontSize: option.size,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* リンク */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => openLink(`${API_BASE_URL}/terms`)}
            style={[styles.linkRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.linkText, { color: colors.text }]}>利用規約</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={() => openLink(`${API_BASE_URL}/privacy`)}
            style={styles.linkRow}
          >
            <Text style={[styles.linkText, { color: colors.text }]}>プライバシーポリシー</Text>
            <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* ログアウト */}
        {user && (
          <Pressable
            onPress={handleLogout}
            style={[
              styles.logoutButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={styles.logoutButtonText}>ログアウト</Text>
          </Pressable>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            © 2025 GOCHISOKOJI
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 15,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 15,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  fontSizeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 44,
    alignItems: 'center',
  },
  fontSizeOptionText: {
    fontWeight: '500',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  linkText: {
    fontSize: 15,
  },
  logoutButton: {
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontSize: 12,
  },
});

