import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { User } from '@supabase/supabase-js';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_OPTIONS: { value: FontSize; label: string; size: number }[] = [
  { value: 'small', label: '小', size: 14 },
  { value: 'medium', label: '中', size: 16 },
  { value: 'large', label: '大', size: 18 },
];

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [fontSize, setFontSize] = React.useState<FontSize>('medium');

  // ユーザー情報を取得
  React.useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (e) {
        console.error('Get user error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ログアウト
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

  // ログインへ
  const handleLogin = () => {
    router.push('/login');
  };

  // 外部リンクを開く
  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      {/* プロフィールカード */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.profileHeader}>
          {user?.user_metadata?.avatar_url ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
              <IconSymbol name="person.fill" size={32} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.profileInfo}>
            {user ? (
              <>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'ユーザー'}
                </Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
                  {user.email}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.userName, { color: colors.text }]}>ゲスト</Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>
                  ログインするとレシピを保存できます
                </Text>
              </>
            )}
          </View>
        </View>

        {!user && (
          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.loginButtonText, { color: colors.primaryForeground }]}>
              ログイン
            </Text>
          </Pressable>
        )}
      </View>

      {/* 設定セクション */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>設定</Text>

        {/* 文字の大きさ */}
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

      {/* リンクセクション */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          onPress={() => openLink(`${API_BASE_URL}/terms`)}
          style={({ pressed }) => [
            styles.linkRow,
            { opacity: pressed ? 0.7 : 1, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.text }]}>利用規約</Text>
          <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
        </Pressable>

        <Pressable
          onPress={() => openLink(`${API_BASE_URL}/privacy`)}
          style={({ pressed }) => [
            styles.linkRow,
            { opacity: pressed ? 0.7 : 1, borderBottomColor: 'transparent' },
          ]}
        >
          <Text style={[styles.linkText, { color: colors.text }]}>プライバシーポリシー</Text>
          <IconSymbol name="chevron.right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {/* ログアウト */}
      {user && (
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={[styles.logoutButtonText, { color: '#ef4444' }]}>ログアウト</Text>
        </Pressable>
      )}

      {/* フッター */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          © 2025 GOCHISOKOJI
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  loginButton: {
    marginTop: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
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
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontSize: 12,
  },
});
