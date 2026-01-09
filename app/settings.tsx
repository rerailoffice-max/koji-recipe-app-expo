import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Linking,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase, API_BASE_URL } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontSize, type FontSizeKey } from '@/hooks/use-font-size';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { User } from '@supabase/supabase-js';

const FONT_SIZE_OPTIONS: { value: FontSizeKey; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // フォントサイズのコンテキストを使用
  const { fontSize, setFontSize } = useFontSize();
  const [localFontSize, setLocalFontSize] = React.useState<FontSizeKey>(fontSize);

  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // プロフィール情報
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState('');
  const [bio, setBio] = React.useState('');

  // 初期データ読み込み
  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setUser(user);

        // Authメタデータから表示名/アバターを先に補完（DBが空でも「何も表示されない」を防ぐ）
        const meta: any = user.user_metadata ?? {};
        const derivedDisplayName: string =
          (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
          (typeof meta.name === 'string' && meta.name.trim()) ||
          (user.email?.split('@')?.[0] ?? '');
        const derivedAvatarUrl: string | null =
          (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
          (typeof meta.picture === 'string' && meta.picture.trim()) ||
          null;

        // 画面の初期表示（DBロード前のフォールバック）
        if (derivedAvatarUrl) setAvatarUrl(derivedAvatarUrl);
        if (derivedDisplayName) setDisplayName(derivedDisplayName);

        // posts.user_id のFKや設定画面の読み込みで users 行が必要になるため、
        // まず public.users を確実に作成/更新してから読む
        try {
          await supabase
            .from('users')
            .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' });
        } catch (upsertErr) {
          console.warn('Profile upsert failed:', upsertErr);
        }

        // プロフィール情報を取得
        const { data: profile, error: profileErr } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        // 0件（PGRST116）は「まだプロフィール未作成」なので致命ではない
        if (profileErr && profileErr.code !== 'PGRST116') {
          console.warn('Load profile error:', profileErr);
        }

        if (profile) {
          // DB値がある場合は優先。空の場合は derived を保持。
          setAvatarUrl(profile.avatar_url || derivedAvatarUrl);
          setDisplayName(profile.display_name || derivedDisplayName || '');
          setBio(profile.bio || '');

          // DBに未設定なら、Authメタデータで補完（ユーザー手入力は上書きしない）
          const patch: any = {};
          if (derivedDisplayName && !(profile.display_name && String(profile.display_name).trim())) {
            patch.display_name = derivedDisplayName;
          }
          if (derivedAvatarUrl && !(profile.avatar_url && String(profile.avatar_url).trim())) {
            patch.avatar_url = derivedAvatarUrl;
          }
          if (Object.keys(patch).length > 0) {
            await supabase.from('users').update(patch).eq('id', user.id);
          }
        }
      } catch (e) {
        console.error('Load profile error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  // コンテキストのフォントサイズが変更されたらローカル状態も更新
  React.useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  // アバター画像を選択
  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await uploadAvatar(uri);
      }
    } catch (e) {
      console.error('Pick avatar error:', e);
      Alert.alert('エラー', '画像の選択に失敗しました。');
    }
  };

  // アバターをアップロード
  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    try {
      setIsSaving(true);

      // Base64データを抽出（Web環境ではdata URLの場合がある）
      let blob: Blob;
      let mimeType = 'image/jpeg';
      
      if (uri.startsWith('data:')) {
        // data URL形式
        const base64Match = uri.match(/^data:([^;]+);base64,(.+)$/);
        if (base64Match) {
          mimeType = base64Match[1];
          const base64Data = base64Match[2];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: mimeType });
        } else {
          throw new Error('Invalid data URL');
        }
      } else {
        // 通常のURI
        const response = await fetch(uri);
        blob = await response.blob();
        mimeType = blob.type || 'image/jpeg';
      }

      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${ext}`;

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:uploadAvatar',message:'[HYP-J] Uploading avatar',data:{fileName,blobSize:blob.size,mimeType},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'})}).catch(()=>{});
      // #endregion

      // アップロード（recipe-imagesバケットを使用）
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, blob, { contentType: mimeType, upsert: true });

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:uploadAvatar:result',message:'[HYP-J] Upload result',data:{uploadData:uploadData?.path,uploadError:uploadError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'})}).catch(()=>{});
      // #endregion

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName);

      // プロフィールを更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
      if (Platform.OS === 'web') {
        window.alert('プロフィール画像を更新しました。');
      } else {
        Alert.alert('完了', 'プロフィール画像を更新しました。');
      }
    } catch (e: any) {
      console.error('Upload avatar error:', e);
      if (Platform.OS === 'web') {
        window.alert('画像のアップロードに失敗しました: ' + (e?.message || ''));
      } else {
        Alert.alert('エラー', '画像のアップロードに失敗しました。');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // プロフィール保存（フォントサイズも含む）
  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);

      // フォントサイズを保存
      if (localFontSize !== fontSize) {
        await setFontSize(localFontSize);
      }

      // ユーザーがログインしている場合はプロフィールも更新
      if (user) {
        const { error } = await supabase
          .from('users')
          .update({
            display_name: displayName.trim() || null,
            bio: bio.trim() || null,
          })
          .eq('id', user.id);

        if (error) throw error;
      }

      Alert.alert('完了', '設定を保存しました。');
    } catch (e) {
      console.error('Save profile error:', e);
      Alert.alert('エラー', '設定の保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // ログアウト
  const handleLogout = () => {
    const runId = `logout_${Date.now()}`;
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId,hypothesisId:'LOGOUT',location:'app/settings.tsx:handleLogout',message:'logout_clicked',data:{platform:Platform.OS},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const doLogout = async () => {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId,hypothesisId:'LOGOUT',location:'app/settings.tsx:doLogout',message:'signOut_start',data:{},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        await supabase.auth.signOut();
        const { data: { session } } = await supabase.auth.getSession();
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId,hypothesisId:'LOGOUT',location:'app/settings.tsx:doLogout',message:'signOut_done',data:{hasSession:!!session},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      } catch (e: any) {
        console.error('Logout error:', e);
      } finally {
        router.replace('/login');
      }
    };

    // Web(PWA)では Alert のボタンコールバックが効かない/確認が出ないことがあるため即ログアウト
    if (Platform.OS === 'web') {
      void doLogout();
      return;
    }

    Alert.alert('ログアウト', 'ログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'ログアウト', style: 'destructive', onPress: () => void doLogout() },
    ]);
  };

  // アカウント削除
  const handleDeleteAccount = () => {
    Alert.alert(
      'アカウントを削除',
      'この操作は取り消せません。すべての投稿、保存したレシピ、プロフィール情報が削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              // ユーザーの投稿を削除
              await supabase.from('posts').delete().eq('user_id', user.id);
              // ユーザーのいいねを削除
              await supabase.from('likes').delete().eq('user_id', user.id);
              // ユーザープロフィールを削除
              await supabase.from('users').delete().eq('id', user.id);
              // サインアウト
              await supabase.auth.signOut();
              router.replace('/login');
            } catch (e) {
              console.error('Delete account error:', e);
              Alert.alert('エラー', 'アカウントの削除に失敗しました。');
            }
          },
        },
      ]
    );
  };

  // 内部ページに遷移
  const navigateTo = (path: string) => {
    // login画面の「利用規約/プライバシーポリシー」と同じく、アプリ内ページへ遷移
    router.push(path as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

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
        {user && (
          <>
            {/* プロフィール画像 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                プロフィール画像
              </Text>
              <View style={styles.avatarRow}>
                <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: `${colors.primary}20` }]}>
                      <IconSymbol name="person.fill" size={32} color={colors.primary} />
                    </View>
                  )}
                  <View style={[styles.avatarBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <IconSymbol name="camera" size={12} color={colors.text} />
                  </View>
                </Pressable>
                <View style={styles.avatarInfo}>
                  <Pressable onPress={handlePickAvatar}>
                    <Text style={[styles.avatarLink, { color: colors.primary }]}>
                      画像を変更
                    </Text>
                  </Pressable>
                  <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
                    JPEG、PNG、GIF、WebP（2MB以下）
                  </Text>
                </View>
              </View>
            </View>

            {/* 表示名 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                表示名
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="表示名を入力"
                placeholderTextColor={colors.mutedForeground}
                maxLength={50}
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            {/* 自己紹介 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                自己紹介
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="自己紹介を入力"
                placeholderTextColor={colors.mutedForeground}
                maxLength={200}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
              <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                {bio.length}/200
              </Text>
            </View>
          </>
        )}

        {/* 文字の大きさ */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            文字の大きさ
          </Text>
          <View style={styles.fontSizeOptions}>
            {FONT_SIZE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setLocalFontSize(option.value)}
                style={[
                  styles.fontSizeOption,
                  {
                    backgroundColor: localFontSize === option.value ? colors.primary : colors.surface,
                    borderColor: localFontSize === option.value ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.fontSizeOptionText,
                    {
                      color: localFontSize === option.value ? colors.primaryForeground : colors.text,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 保存ボタン */}
        {user && (
          <Pressable
            onPress={handleSaveProfile}
            disabled={isSaving}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                opacity: pressed || isSaving ? 0.8 : 1,
              },
            ]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>
                変更を保存
              </Text>
            )}
          </Pressable>
        )}

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* ログアウト */}
        {user && (
          <Pressable
            onPress={handleLogout}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              ログアウト
            </Text>
          </Pressable>
        )}

        {/* アカウント削除 */}
        {user && (
          <Pressable
            onPress={handleDeleteAccount}
            style={[
              styles.actionButton,
              {
                backgroundColor: 'transparent',
                borderColor: '#ef4444',
              },
            ]}
          >
            <IconSymbol name="trash" size={18} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
              アカウントを削除
            </Text>
          </Pressable>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => navigateTo('/terms')}>
              <Text style={[styles.legalLink, { color: colors.mutedForeground }]}>
                利用規約
              </Text>
            </Pressable>
            <Text style={[styles.legalDivider, { color: colors.mutedForeground }]}>|</Text>
            <Pressable onPress={() => navigateTo('/privacy')}>
              <Text style={[styles.legalLink, { color: colors.mutedForeground }]}>
                プライバシーポリシー
              </Text>
            </Pressable>
          </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarInfo: {
    flex: 1,
    gap: 4,
  },
  avatarLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  avatarHint: {
    fontSize: 12,
  },
  textInput: {
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 4,
    fontSize: 15,
  },
  textArea: {
    height: 88,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 4,
    paddingTop: Spacing.sm,
    fontSize: 15,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  fontSizeOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fontSizeOption: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  saveButton: {
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legalLink: {
    fontSize: 12,
  },
  legalDivider: {
    fontSize: 12,
  },
  footerText: {
    fontSize: 11,
  },
});
