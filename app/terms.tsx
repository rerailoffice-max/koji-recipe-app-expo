import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TermsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title="利用規約"
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第1条（適用）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            本利用規約（以下「本規約」といいます。）は、GOCHISOKOJI（以下「当サービス」といいます。）の利用条件を定めるものです。
            登録ユーザーの皆さま（以下「ユーザー」といいます。）には、本規約に従って、当サービスをご利用いただきます。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第2条（利用登録）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            登録希望者が当サービスの定める方法によって利用登録を申請し、当サービスがこれを承認することによって、
            利用登録が完了するものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第3条（ユーザーIDおよびパスワードの管理）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            ユーザーは、自己の責任において、当サービスのユーザーIDおよびパスワードを適切に管理するものとします。
            ユーザーID及びパスワードが第三者によって使用されたことによって生じた損害は、当サービスに故意又は重大な過失がある場合を除き、
            当サービスは一切の責任を負わないものとします。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第4条（禁止事項）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません。{'\n'}
            {'\n'}・法令または公序良俗に違反する行為{'\n'}
            ・犯罪行為に関連する行為{'\n'}
            ・当サービスの他のユーザーの個人情報を不正に収集する行為{'\n'}
            ・不正アクセスをし、またはこれを試みる行為{'\n'}
            ・当サービスの運営を妨害するおそれのある行為{'\n'}
            ・その他、当サービスが不適切と判断する行為
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第5条（免責事項）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスで提供されるレシピやAI生成コンテンツは、参考情報として提供されるものであり、
            食物アレルギーや健康状態に関する専門的なアドバイスではありません。
            レシピの利用に際しては、ご自身の責任において判断してください。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第6条（サービス内容の変更等）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスは、ユーザーへの事前の通知なく、サービスの内容を変更し、
            またはサービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>第7条（利用規約の変更）</Text>
          <Text style={[styles.sectionText, { color: colors.text }]}>
            当サービスは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
            変更後の利用規約は、当サービス上での掲示をもって効力を生じるものとします。
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

