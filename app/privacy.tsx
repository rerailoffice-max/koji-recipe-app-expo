import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function PrivacyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title="プライバシーポリシー"
        leftAction={
          <Pressable onPress={() => router.back()} style={styles.appBarButton}>
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          最終更新日: 2025年1月6日
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>1. 収集する情報</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスでは、以下の情報を収集する場合があります。{'\n'}
            {'\n'}・メールアドレス{'\n'}
            ・表示名、プロフィール画像{'\n'}
            ・投稿されたレシピ情報{'\n'}
            ・サービス利用状況に関する情報
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>2. 情報の利用目的</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            収集した情報は、以下の目的で利用します。{'\n'}
            {'\n'}・サービスの提供・運営{'\n'}
            ・ユーザーサポート{'\n'}
            ・サービスの改善{'\n'}
            ・重要なお知らせの通知
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>3. 情報の第三者提供</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。{'\n'}
            {'\n'}・ユーザーの同意がある場合{'\n'}
            ・法令に基づく場合{'\n'}
            ・人の生命、身体または財産の保護のために必要がある場合
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>4. セキュリティ</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスは、ユーザーの個人情報を適切に管理し、不正アクセス、紛失、破壊、改ざん、
            漏洩などを防止するために、必要かつ適切なセキュリティ対策を講じます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Cookie・Analytics</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスでは、サービス改善のためにCookieおよびアナリティクスツールを使用する場合があります。
            これらはユーザーを個人として特定するものではありません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>6. AI機能について</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスのAI機能は、Google Gemini APIを使用しています。
            AIとの会話内容は、サービス改善の目的で一時的に処理されますが、
            個人を特定する形で保存されることはありません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>7. ポリシーの変更</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
            変更後のポリシーは、当サービス上での掲示をもって効力を生じます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>8. お問い合わせ</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            プライバシーに関するお問い合わせは、アプリ内のお問い合わせ機能または
            サポートメールアドレスまでご連絡ください。
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          © 2025 GOCHISOKOJI
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appBarButton: {
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
  },
  lastUpdated: {
    fontSize: 12,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});



