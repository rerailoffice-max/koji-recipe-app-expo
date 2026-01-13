import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useToast } from '@/contexts/ToastContext';
import type { User } from '@supabase/supabase-js';


export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // プロフィール情報
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState('');
  const [bio, setBio] = React.useState('');

  // アカウント設定
  const [newEmail, setNewEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isChangingEmail, setIsChangingEmail] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  
  // パスワード設定済みフラグ
  const [hasPasswordSet, setHasPasswordSet] = React.useState(false);


  // ログイン方法の判定
  const isEmailUser = React.useMemo(() => {
    if (!user) return false;
    const provider = user.app_metadata?.provider;
    return provider === 'email';
  }, [user]);

  const isGoogleUser = React.useMemo(() => {
    if (!user) return false;
    const provider = user.app_metadata?.provider;
    const providers = user.app_metadata?.providers as string[] | undefined;
    return provider === 'google' || providers?.includes('google');
  }, [user]);


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
        setNewEmail(user.email || '');

        // Authメタデータから表示名/アバターを先に補完
        const meta: any = user.user_metadata ?? {};
        const derivedDisplayName: string =
          (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
          (typeof meta.name === 'string' && meta.name.trim()) ||
          (user.email?.split('@')?.[0] ?? '');
        const derivedAvatarUrl: string | null =
          (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) ||
          (typeof meta.picture === 'string' && meta.picture.trim()) ||
          null;

        if (derivedAvatarUrl) setAvatarUrl(derivedAvatarUrl);
        if (derivedDisplayName) setDisplayName(derivedDisplayName);

        // public.users を確実に作成/更新
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

        if (profileErr && profileErr.code !== 'PGRST116') {
          console.warn('Load profile error:', profileErr);
        }

        if (profile) {
          setAvatarUrl(profile.avatar_url || derivedAvatarUrl);
          setDisplayName(profile.display_name || derivedDisplayName || '');
          setBio(profile.bio || '');
          if (profile.has_password) setHasPasswordSet(true);

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
      showToast({ message: '画像の選択に失敗しました', type: 'error' });
    }
  };

  // アバターをアップロード
  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    try {
      setIsSaving(true);

      let blob: Blob;
      let mimeType = 'image/jpeg';
      
      if (uri.startsWith('data:')) {
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
        const response = await fetch(uri);
        blob = await response.blob();
        mimeType = blob.type || 'image/jpeg';
      }

      const ext = mimeType.split('/')[1] || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, blob, { contentType: mimeType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      showToast({ message: 'プロフィール画像を更新しました', type: 'success' });
    } catch (e: any) {
      console.error('Upload avatar error:', e);
      showToast({ message: '画像のアップロードに失敗しました', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // プロフィール保存
  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      showToast({ message: '設定を保存しました', type: 'success' });
    } catch (e) {
      console.error('Save profile error:', e);
      showToast({ message: '設定の保存に失敗しました', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // メールアドレス変更
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      showToast({ message: 'メールアドレスを入力してください', type: 'error' });
      return;
    }

    if (newEmail === user?.email) {
      showToast({ message: '現在と同じメールアドレスです', type: 'info' });
      return;
    }

    try {
      setIsChangingEmail(true);

      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });

      if (error) throw error;

      showToast({ message: '確認メールを送信しました。メールを確認してください。', type: 'success' });
    } catch (e: any) {
      console.error('Change email error:', e);
      showToast({ message: e.message || 'メールアドレスの変更に失敗しました', type: 'error' });
    } finally {
      setIsChangingEmail(false);
    }
  };

  // パスワード変更
  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      showToast({ message: 'パスワードを入力してください', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      showToast({ message: 'パスワードは6文字以上で入力してください', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({ message: 'パスワードが一致しません', type: 'error' });
      return;
    }

    try {
      setIsChangingPassword(true);

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      showToast({ message: 'パスワードを変更しました', type: 'success' });
    } catch (e: any) {
      console.error('Change password error:', e);
      showToast({ message: e.message || 'パスワードの変更に失敗しました', type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Googleユーザー向け：パスワード追加設定
  const handleAddPassword = async () => {
    if (!newPassword.trim()) {
      showToast({ message: 'パスワードを入力してください', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      showToast({ message: 'パスワードは6文字以上で入力してください', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast({ message: 'パスワードが一致しません', type: 'error' });
      return;
    }

    try {
      setIsChangingPassword(true);

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:handleAddPassword:start',message:'Add password for Google user',data:{email:user?.email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2'})}).catch(()=>{});
      // #endregion

      const { error } = await supabase.auth.updateUser({ password: newPassword });

      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:handleAddPassword:result',message:'Add password result',data:{error:error?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2'})}).catch(()=>{});
      // #endregion

      if (error) throw error;

      // public.usersにhas_passwordフラグを設定
      if (user) {
        await supabase.from('users').update({ has_password: true }).eq('id', user.id);
      }
      setHasPasswordSet(true);

      setNewPassword('');
      setConfirmPassword('');
      showToast({ message: 'パスワードを設定しました。メール+パスワードでもログインできます。', type: 'success' });
    } catch (e: any) {
      console.error('Add password error:', e);
      showToast({ message: e.message || 'パスワードの設定に失敗しました', type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };


  // ログアウト
  const handleLogout = () => {
    const doLogout = async () => {
      try {
        await supabase.auth.signOut();
      } catch (e: any) {
        console.error('Logout error:', e);
      } finally {
        router.replace('/login');
      }
    };

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
  const handleDeleteAccount = async () => {
    if (!user) return;

    const doDelete = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:doDelete:start',message:'Delete account started (via API)',data:{userId:user.id,userEmail:user.email},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D,E'})}).catch(()=>{});
      // #endregion
      try {
        // セッションを取得してアクセストークンを取得
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('セッションが無効です。再度ログインしてください。');
        }

        // APIサーバーにアカウント削除をリクエスト
        const response = await fetch('https://api.gochisokoji.com/api/auth/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const result = await response.json();

        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:doDelete:apiResult',message:'Delete API result',data:{status:response.status,success:result?.success,error:result?.error||null},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'アカウントの削除に失敗しました');
        }

        // ローカルのセッションをクリア
        await supabase.auth.signOut();

        router.replace('/login');
        showToast({ message: 'アカウントを削除しました', type: 'success' });
      } catch (e: any) {
        // #region agent log
        fetch('http://127.0.0.1:7246/ingest/e2971e0f-c017-418c-8c61-59d0d72fe3aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings.tsx:doDelete:catch',message:'Delete error caught',data:{errorMessage:e?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.error('Delete account error:', e);
        showToast({ message: e.message || 'アカウントの削除に失敗しました', type: 'error' });
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'アカウントを削除しますか？\n\nこの操作は取り消せません。すべての投稿、保存したレシピ、プロフィール情報が削除されます。'
      );
      if (confirmed) {
        await doDelete();
      }
      return;
    }

    Alert.alert(
      'アカウントを削除',
      'この操作は取り消せません。すべての投稿、保存したレシピ、プロフィール情報が削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除する', style: 'destructive', onPress: doDelete },
      ]
    );
  };

  // 内部ページに遷移
  const navigateTo = (path: string) => {
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

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* アカウント設定 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                アカウント設定
              </Text>

              {/* メールログインユーザー向け */}
              {isEmailUser && (
                <>
                  {/* メールアドレス変更 */}
                  <View style={styles.subsection}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      メールアドレス
                    </Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        value={newEmail}
                        onChangeText={setNewEmail}
                        placeholder="新しいメールアドレス"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={[
                          styles.textInput,
                          styles.flexInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                      />
                      <Pressable
                        onPress={handleChangeEmail}
                        disabled={isChangingEmail}
                        style={[
                          styles.smallButton,
                          {
                            backgroundColor: colors.primary,
                            opacity: isChangingEmail ? 0.7 : 1,
                          },
                        ]}
                      >
                        {isChangingEmail ? (
                          <ActivityIndicator size="small" color={colors.primaryForeground} />
                        ) : (
                          <Text style={[styles.smallButtonText, { color: colors.primaryForeground }]}>
                            変更
                          </Text>
                        )}
                      </Pressable>
                    </View>
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                      変更後、確認メールが送信されます
                    </Text>
                  </View>

                  {/* パスワード変更 */}
                  <View style={styles.subsection}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      パスワード変更
                    </Text>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="新しいパスワード（6文字以上）"
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="パスワード確認"
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          color: colors.text,
                          marginTop: Spacing.sm,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                      style={[
                        styles.changeButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: isChangingPassword ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <Text style={[styles.changeButtonText, { color: colors.primaryForeground }]}>
                          パスワードを変更
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}

              {/* Googleログインユーザー向け：パスワード追加設定 */}
              {isGoogleUser && (
                <View style={styles.subsection}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    ログイン方法
                  </Text>
                  <View style={styles.linkingStatus}>
                    <View style={styles.linkingInfo}>
                      <IconSymbol name="checkmark.circle.fill" size={20} color="#34A853" />
                      <Text style={[styles.linkingText, { color: colors.text }]}>
                        Googleアカウントでログイン中
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    メールアドレス: {user?.email}
                  </Text>
                  
                  {/* パスワード追加設定 */}
                  <View style={[styles.passwordAddSection, { marginTop: Spacing.md }]}>
                    <Text style={[styles.sectionLabel, { color: colors.text }]}>
                      パスワード設定（任意）
                    </Text>
                    
                    {hasPasswordSet ? (
                      // パスワード設定済みの場合
                      <View style={[styles.passwordSetBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <IconSymbol name="checkmark.circle.fill" size={20} color="#34A853" />
                        <Text style={[styles.passwordSetText, { color: colors.text }]}>
                          パスワード設定済み
                        </Text>
                      </View>
                    ) : (
                      // パスワード未設定の場合
                      <>
                        <Text style={[styles.hint, { color: colors.mutedForeground, marginBottom: Spacing.sm }]}>
                          設定すると、メール+パスワードでもログインできます
                        </Text>
                        <TextInput
                          value={newPassword}
                          onChangeText={setNewPassword}
                          placeholder="パスワード（6文字以上）"
                          placeholderTextColor={colors.mutedForeground}
                          secureTextEntry
                          style={[
                            styles.textInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              color: colors.text,
                            },
                          ]}
                        />
                        <TextInput
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          placeholder="パスワード確認"
                          placeholderTextColor={colors.mutedForeground}
                          secureTextEntry
                          style={[
                            styles.textInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              color: colors.text,
                              marginTop: Spacing.sm,
                            },
                          ]}
                        />
                        <Pressable
                          onPress={handleAddPassword}
                          disabled={isChangingPassword}
                          style={[
                            styles.changeButton,
                            {
                              backgroundColor: colors.primary,
                              opacity: isChangingPassword ? 0.7 : 1,
                            },
                          ]}
                        >
                          {isChangingPassword ? (
                            <ActivityIndicator size="small" color={colors.primaryForeground} />
                          ) : (
                            <Text style={[styles.changeButtonText, { color: colors.primaryForeground }]}>
                              パスワードを設定
                            </Text>
                          )}
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              )}

            </View>
          </>
        )}

        {/* プロフィール保存ボタン */}
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
                プロフィールを保存
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
          <View style={styles.deleteSection}>
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
            <Text style={[styles.deleteNote, { color: colors.mutedForeground }]}>
              ※ 削除後にGoogleで再ログインすると新しいアカウントが作成されます
            </Text>
          </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  subsection: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  flexInput: {
    flex: 1,
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
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  smallButton: {
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeButton: {
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    marginTop: 2,
  },
  linkingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  linkingText: {
    fontSize: 14,
  },
  unlinkButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  unlinkButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  googleIcon: {
    width: 18,
    height: 18,
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
  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalForm: {
    gap: Spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emailDisplay: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
  },
  emailDisplayLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  emailDisplayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  passwordAddSection: {
    gap: Spacing.sm,
  },
  passwordSetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  passwordSetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deleteSection: {
    gap: Spacing.xs,
  },
  deleteNote: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
});
