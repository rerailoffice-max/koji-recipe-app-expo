import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useImagePicker } from '@/hooks/use-image-picker';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

// API Base URL - 本番用
const API_BASE_URL = 'https://api.gochisokoji.com';

// 型定義
interface Ingredient {
  name: string;
  amount: string;
}

interface Step {
  order: number;
  description: string;
}

interface FormData {
  title: string;
  description: string;
  koji_type: string;
  difficulty: string;
  ingredients: Ingredient[];
  steps: Step[];
  image_url: string | null;
  // 栄養情報
  salt_g: string;
  calories: string;
  cooking_time_min: string;
  // タグ
  tags: string[];
}

// 麹の種類
const KOJI_TYPES = [
  { value: 'たまねぎ麹', label: '🧅 旨塩' },
  { value: 'コンソメ麹', label: '🥕 コンソメ' },
  { value: '中華麹', label: '🧄 中華' },
];

// 難易度
const DIFFICULTIES = [
  { value: 'かんたん', label: 'かんたん' },
  { value: 'ふつう', label: 'ふつう' },
  { value: 'むずかしい', label: 'むずかしい' },
];

// タグオプション
const TAG_OPTIONS = [
  { value: '魚', emoji: '🐟' },
  { value: '肉', emoji: '🍖' },
  { value: '卵', emoji: '🥚' },
  { value: '野菜', emoji: '🥬' },
  { value: '時短', emoji: '⚡' },
  { value: '作り置き', emoji: '📦' },
  { value: 'おつまみ', emoji: '🍺' },
  { value: 'ダイエット', emoji: '🏃' },
  { value: '主菜', emoji: '🍳' },
  { value: '副菜', emoji: '🥒' },
  { value: 'スープ', emoji: '🍲' },
  { value: 'サラダ', emoji: '🥗' },
];

// JSONを安全にパースするヘルパー
function safeJsonParse<T>(str: string | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    console.warn('JSON parse error:', e, 'input:', str);
    return fallback;
  }
}

export default function RecipeEditScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{
    draftId?: string;
    title?: string;
    description?: string;
    koji_type?: string;
    difficulty?: string;
    ingredients?: string;
    steps?: string;
    image_base64?: string;
    image_url?: string;
  }>();

  // フォームの初期値を設定
  const [formData, setFormData] = React.useState<FormData>({
    title: '',
    description: '',
    koji_type: '中華麹',
    difficulty: 'かんたん',
    ingredients: [{ name: '', amount: '' }],
    steps: [{ order: 1, description: '' }],
    image_url: null,
    salt_g: '',
    calories: '',
    cooking_time_min: '',
    tags: [],
  });

  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = React.useState(false);
  const modalScaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = React.useRef(new Animated.Value(0)).current;

  // パラメータからフォームデータを設定（params変更時に実行）
  React.useEffect(() => {
    // パラメータが存在するかチェック
    const titleParam = params.title;
    const ingredientsParam = params.ingredients;
    const stepsParam = params.steps;
    const draftIdParam = params.draftId;
    
    // デバッグログ
    console.log('[RecipeEdit] params received:', {
      title: titleParam,
      ingredients: ingredientsParam?.substring?.(0, 50) || ingredientsParam,
      steps: stepsParam?.substring?.(0, 50) || stepsParam,
      draftId: draftIdParam,
    });
    
    const hasParams = titleParam || ingredientsParam || stepsParam;
    
    if (hasParams) {
      const initialIngredients = safeJsonParse<Ingredient[]>(
        ingredientsParam,
        [{ name: '', amount: '' }]
      );
      const initialSteps = safeJsonParse<Step[]>(
        stepsParam,
        [{ order: 1, description: '' }]
      );

      console.log('[RecipeEdit] Setting form data:', {
        title: titleParam,
        ingredientsCount: initialIngredients.length,
        stepsCount: initialSteps.length,
      });

      setFormData({
        title: titleParam || '',
        description: params.description || '',
        koji_type: params.koji_type || '中華麹',
        difficulty: params.difficulty || 'かんたん',
        ingredients: initialIngredients.length > 0 ? initialIngredients : [{ name: '', amount: '' }],
        steps: initialSteps.length > 0 ? initialSteps : [{ order: 1, description: '' }],
        image_url: params.image_url || null,
        salt_g: '',
        calories: '',
        cooking_time_min: '',
        tags: [],
      });
      
      // チャットから渡された画像を設定（Base64）
      if (params.image_base64) {
        const base64 = params.image_base64;
        if (base64.startsWith('data:')) {
          setImageUri(base64);
        } else {
          setImageUri(`data:image/jpeg;base64,${base64}`);
        }
      }
      // 既存の画像URL（編集時）
      else if (params.image_url) {
        setImageUri(params.image_url);
      }
    }

    if (draftIdParam) {
      setDraftId(draftIdParam);
    }
  }, [params.title, params.ingredients, params.steps, params.draftId, params.description, params.koji_type, params.difficulty, params.image_base64, params.image_url]);

  const { takePhoto, pickFromLibrary } = useImagePicker();

  // 画像選択
  const handlePickImage = async () => {
    
    // Web環境ではAlert.alertが動作しないため、直接ライブラリから選択
    if (Platform.OS === 'web') {
      const attachment = await pickFromLibrary();
      if (attachment?.dataUrl) {
        setImageUri(attachment.dataUrl);
      }
      return;
    }
    
    Alert.alert(
      '写真を選択',
      '',
      [
        {
          text: '写真を撮影',
          onPress: async () => {
            const attachment = await takePhoto();
            if (attachment?.dataUrl) {
              setImageUri(attachment.dataUrl);
            }
          },
        },
        {
          text: 'ライブラリから選択',
          onPress: async () => {
            const attachment = await pickFromLibrary();
            if (attachment?.dataUrl) {
              setImageUri(attachment.dataUrl);
            }
          },
        },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  // 材料の追加
  const addIngredient = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '' }],
    }));
  };

  // 材料の削除
  const removeIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  // 材料の更新
  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));
  };

  // 手順の追加
  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, { order: prev.steps.length + 1, description: '' }],
    }));
  };

  // 手順の削除
  const removeStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  // 手順の更新
  const updateStep = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, description: value } : step
      ),
    }));
  };

  // データのクリーンアップ
  const buildCleanData = () => {
    const validIngredients = formData.ingredients.filter(
      (i) => i.name.trim() && i.amount.trim()
    );
    const validSteps = formData.steps
      .filter((s) => s.description.trim())
      .map((s, index) => ({ ...s, order: index + 1 }));

    return {
      ...formData,
      ingredients: validIngredients,
      steps: validSteps,
    };
  };

  // 下書き保存
  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      showToast({ message: 'タイトルを入力してください', type: 'error' });
      return;
    }

    setIsSavingDraft(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showToast({ message: '下書き保存にはログインが必要です', type: 'info' });
        setTimeout(() => router.push('/login'), 1500);
        setIsSavingDraft(false);
        return;
      }

      const cleanData = buildCleanData();

      // posts.user_id が public.users を参照するため、プロフィール行を事前に作成/更新
      await supabase
        .from('users')
        .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' });

      // 画像をSupabaseストレージにアップロード
      let uploadedImageUrl: string | null = null;
      if (imageUri) {
        try {
          const base64Match = imageUri.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const mimeType = base64Match[1];
            const base64Data = base64Match[2];
            const ext = mimeType.split('/')[1] || 'jpg';
            const fileName = `${user.id}/${Date.now()}.${ext}`;
            
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('recipe-images')
              .upload(fileName, blob, { contentType: mimeType, upsert: true });
            
            if (!uploadError && uploadData) {
              const { data: { publicUrl } } = supabase.storage
                .from('recipe-images')
                .getPublicUrl(uploadData.path);
              uploadedImageUrl = publicUrl;
            }
          }
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
        }
      }

      const postData = {
        user_id: user.id,
        title: cleanData.title,
        description: cleanData.description,
        koji_type: cleanData.koji_type,
        difficulty: cleanData.difficulty,
        ingredients: cleanData.ingredients,
        steps: cleanData.steps,
        image_url: uploadedImageUrl || formData.image_url,
        is_public: false,
        is_ai_generated: false,
        // 栄養情報
        salt_g: cleanData.salt_g ? parseFloat(cleanData.salt_g) : null,
        calories: cleanData.calories ? parseInt(cleanData.calories, 10) : null,
        cooking_time_min: cleanData.cooking_time_min ? parseInt(cleanData.cooking_time_min, 10) : null,
        tags: cleanData.tags.length > 0 ? cleanData.tags : null,
      };

      if (draftId) {
        // 既存の下書きを更新
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', draftId);

        if (error) throw error;
      } else {
        // 新規下書きを作成
        const { data, error } = await supabase
          .from('posts')
          .insert(postData)
          .select('id')
          .single();

        if (error) throw error;
        if (data) setDraftId(data.id);
      }

      showToast({ message: '下書きを保存しました', type: 'success' });
    } catch (e: any) {
      console.error('Save draft error:', e);
      showToast({ message: e?.message || '下書きの保存に失敗しました', type: 'error' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 投稿規定モーダルを開く
  const openTermsModal = () => {
    setShowTermsModal(true);
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 投稿規定モーダルを閉じる
  const closeTermsModal = () => {
    Animated.parallel([
      Animated.timing(modalScaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowTermsModal(false);
    });
  };

  // 投稿ボタン押下時（まずバリデーション→モーダル表示）
  const handleSubmitPress = () => {
    if (!formData.title.trim()) {
      showToast({ message: 'タイトルを入力してください', type: 'error' });
      return;
    }

    // 写真必須チェック
    if (!imageUri && !formData.image_url) {
      showToast({ message: '写真を追加してください', type: 'error' });
      return;
    }

    // バリデーション通過後、投稿規定モーダルを表示
    openTermsModal();
  };

  // 投稿実行（モーダルで同意後に実行）
  const handleSubmit = async () => {
    closeTermsModal();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        showToast({ message: '投稿にはログインが必要です', type: 'info' });
        setTimeout(() => router.push('/login'), 1500);
        setIsSubmitting(false);
        return;
      }

      const cleanData = buildCleanData();

      // posts.user_id が public.users を参照するため、プロフィール行を事前に作成/更新
      await supabase
        .from('users')
        .upsert({ id: user.id, email: user.email ?? null }, { onConflict: 'id' });

      // 画像をSupabaseストレージにアップロード
      let uploadedImageUrl: string | null = null;
      
      if (imageUri) {
        try {
          // Base64データを抽出
          const base64Match = imageUri.match(/^data:([^;]+);base64,(.+)$/);
          if (base64Match) {
            const mimeType = base64Match[1];
            const base64Data = base64Match[2];
            const ext = mimeType.split('/')[1] || 'jpg';
            const fileName = `${user.id}/${Date.now()}.${ext}`;
            
            // Base64をBlobに変換
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mimeType });
            
            // Supabaseストレージにアップロード
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('recipe-images')
              .upload(fileName, blob, { contentType: mimeType, upsert: true });
            
            
            if (!uploadError && uploadData) {
              // 公開URLを取得
              const { data: { publicUrl } } = supabase.storage
                .from('recipe-images')
                .getPublicUrl(uploadData.path);
              uploadedImageUrl = publicUrl;
            }
          }
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
          // 画像アップロード失敗しても投稿は続行
        }
      }

      const postData = {
        user_id: user.id,
        title: cleanData.title,
        description: cleanData.description,
        koji_type: cleanData.koji_type,
        difficulty: cleanData.difficulty,
        ingredients: cleanData.ingredients,
        steps: cleanData.steps,
        image_url: uploadedImageUrl || formData.image_url,
        is_public: true,
        is_ai_generated: false,
        // 栄養情報
        salt_g: cleanData.salt_g ? parseFloat(cleanData.salt_g) : null,
        calories: cleanData.calories ? parseInt(cleanData.calories, 10) : null,
        cooking_time_min: cleanData.cooking_time_min ? parseInt(cleanData.cooking_time_min, 10) : null,
        tags: cleanData.tags.length > 0 ? cleanData.tags : null,
      };

      if (draftId) {
        // 下書きを公開
        const { error } = await supabase
          .from('posts')
          .update(postData)
          .eq('id', draftId);

        if (error) throw error;
      } else {
        // 新規投稿
        const { error } = await supabase
          .from('posts')
          .insert(postData);

        if (error) throw error;
      }

      // 投稿完了のトースト表示後に遷移
      showToast({ message: 'レシピを投稿しました！', type: 'success' });
      setTimeout(() => {
        router.replace({ pathname: '/', params: { refresh: String(Date.now()) } } as any);
      }, 1000);
    } catch (e: any) {
      console.error('Submit error:', e);
      showToast({ message: e?.message || '投稿に失敗しました', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // セレクト用のピッカー（簡易版）
  const SelectPicker = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
  }) => (
    <View style={styles.selectContainer}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.selectWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.selectOption,
              value === option.value && { backgroundColor: `${colors.primary}1A` },
            ]}
          >
            <Text
              style={[
                styles.selectOptionText,
                { color: value === option.value ? colors.primary : colors.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AppBar */}
      <AppBar
        title={draftId ? 'レシピを編集' : 'レシピを作成'}
        leftAction={
          <Pressable onPress={() => router.back()} style={styles.appBarButton}>
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* 写真セクション */}
          <Pressable onPress={handlePickImage} style={styles.imageSection}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : formData.image_url ? (
              <Image source={{ uri: formData.image_url }} style={styles.imagePreview} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
                <IconSymbol name="camera" size={48} color={colors.mutedForeground} />
                <Text style={[styles.imagePlaceholderText, { color: colors.mutedForeground }]}>
                  写真を追加
                </Text>
              </View>
            )}
          </Pressable>

          <View style={styles.formContent}>
            {/* タイトル */}
            <View style={styles.fieldContainer}>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                placeholder="レシピ名を入力"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.titleInput,
                  { color: colors.text, borderBottomColor: colors.border },
                ]}
              />
            </View>

            {/* 説明 */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>説明</Text>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                placeholder="このレシピについて説明してください"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              />
            </View>

            {/* 麹の種類 */}
            <SelectPicker
              label="麹の種類"
              value={formData.koji_type}
              options={KOJI_TYPES}
              onChange={(value) => setFormData((prev) => ({ ...prev, koji_type: value }))}
            />

            {/* 難易度 */}
            <SelectPicker
              label="難易度"
              value={formData.difficulty}
              options={DIFFICULTIES}
              onChange={(value) => setFormData((prev) => ({ ...prev, difficulty: value }))}
            />

            {/* 栄養情報・調理時間 */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>栄養情報（任意）</Text>
              <View style={styles.nutritionRow}>
                <View style={styles.nutritionField}>
                  <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>⏱ 調理時間</Text>
                  <View style={[styles.nutritionInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TextInput
                      value={formData.cooking_time_min}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, cooking_time_min: text.replace(/[^0-9]/g, '') }))}
                      placeholder="15"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      style={[styles.nutritionInput, { color: colors.text }]}
                    />
                    <Text style={[styles.nutritionUnit, { color: colors.mutedForeground }]}>分</Text>
                  </View>
                </View>
                <View style={styles.nutritionField}>
                  <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>🔥 カロリー</Text>
                  <View style={[styles.nutritionInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TextInput
                      value={formData.calories}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, calories: text.replace(/[^0-9]/g, '') }))}
                      placeholder="350"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      style={[styles.nutritionInput, { color: colors.text }]}
                    />
                    <Text style={[styles.nutritionUnit, { color: colors.mutedForeground }]}>kcal</Text>
                  </View>
                </View>
                <View style={styles.nutritionField}>
                  <Text style={[styles.nutritionLabel, { color: colors.mutedForeground }]}>🧂 塩分</Text>
                  <View style={[styles.nutritionInputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <TextInput
                      value={formData.salt_g}
                      onChangeText={(text) => setFormData((prev) => ({ ...prev, salt_g: text.replace(/[^0-9.]/g, '') }))}
                      placeholder="2.5"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="decimal-pad"
                      style={[styles.nutritionInput, { color: colors.text }]}
                    />
                    <Text style={[styles.nutritionUnit, { color: colors.mutedForeground }]}>g</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* タグ選択 */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>タグ（任意）</Text>
              <View style={styles.tagGrid}>
                {TAG_OPTIONS.map((tag) => {
                  const isSelected = formData.tags.includes(tag.value);
                  return (
                    <Pressable
                      key={tag.value}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          tags: isSelected
                            ? prev.tags.filter((t) => t !== tag.value)
                            : [...prev.tags, tag.value],
                        }));
                      }}
                      style={[
                        styles.tagChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          { color: isSelected ? '#fff' : colors.text },
                        ]}
                      >
                        {tag.emoji} {tag.value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 材料 */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>材料</Text>
              {formData.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientRow}>
                  <View
                    style={[
                      styles.ingredientInputs,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <TextInput
                      value={ingredient.name}
                      onChangeText={(text) => updateIngredient(index, 'name', text)}
                      placeholder="材料名"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.ingredientName, { color: colors.text }]}
                    />
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <TextInput
                      value={ingredient.amount}
                      onChangeText={(text) => updateIngredient(index, 'amount', text)}
                      placeholder="分量"
                      placeholderTextColor={colors.mutedForeground}
                      style={[styles.ingredientAmount, { color: colors.text }]}
                    />
                  </View>
                  {formData.ingredients.length > 1 && (
                    <Pressable
                      onPress={() => removeIngredient(index)}
                      style={styles.removeButton}
                    >
                      <IconSymbol name="xmark" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable onPress={addIngredient} style={styles.addButton}>
                <IconSymbol name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>材料を追加</Text>
              </Pressable>
            </View>

            {/* 手順 */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>作り方</Text>
              {formData.steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View
                    style={[styles.stepNumber, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.stepNumberText, { color: colors.primaryForeground }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <TextInput
                    value={step.description}
                    onChangeText={(text) => updateStep(index, text)}
                    placeholder={`手順${index + 1}を入力してください`}
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.stepInput,
                      { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  />
                  {formData.steps.length > 1 && (
                    <Pressable
                      onPress={() => removeStep(index)}
                      style={styles.removeButton}
                    >
                      <IconSymbol name="xmark" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable onPress={addStep} style={styles.addButton}>
                <IconSymbol name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addButtonText, { color: colors.primary }]}>手順を追加</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* アクションボタン */}
        <View
          style={[
            styles.actionBar,
            { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <Pressable
            onPress={handleSaveDraft}
            disabled={isSubmitting || isSavingDraft}
            style={[
              styles.actionButton,
              styles.draftButton,
              { borderColor: colors.primary },
            ]}
          >
            {isSavingDraft ? (
              <View style={styles.actionButtonContent}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                  下書き作成中…
                </Text>
              </View>
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                下書き保存
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={handleSubmitPress}
            disabled={isSubmitting || isSavingDraft}
            style={[
              styles.actionButton,
              styles.submitButton,
              { backgroundColor: colors.primary },
            ]}
          >
            {isSubmitting ? (
              <View style={styles.actionButtonContent}>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                  投稿中…
                </Text>
              </View>
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                投稿する
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* 投稿規定モーダル */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="none"
        onRequestClose={closeTermsModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeTermsModal}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.background,
                transform: [{ scale: modalScaleAnim }],
                opacity: modalOpacityAnim,
              },
            ]}
          >
            <Pressable onPress={() => {}}>
              {/* タイトル */}
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                投稿前のおねがい 🍳
              </Text>

              {/* 説明 */}
              <Text style={[styles.modalDescription, { color: colors.mutedForeground }]}>
                みんなが楽しめるレシピコミュニティを{'\n'}一緒につくっていきましょう！
              </Text>

              {/* 注意事項 */}
              <View style={[styles.modalNotice, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                <Text style={[styles.modalNoticeText, { color: colors.text }]}>
                  以下の場合、投稿が削除される{'\n'}可能性がありますのでご了承ください
                </Text>
                <Text style={[styles.modalNoticeList, { color: colors.mutedForeground }]}>
                  • お料理と関係のない内容の投稿{'\n'}
                  • 写真とレシピ内容が一致しない投稿
                </Text>
              </View>

              <Text style={[styles.modalThanks, { color: colors.mutedForeground }]}>
                ご協力ありがとうございます 🙏
              </Text>

              {/* ボタン */}
              <View style={styles.modalButtons}>
                <Pressable
                  onPress={closeTermsModal}
                  style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.mutedForeground }]}>
                    キャンセル
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  style={[styles.modalButton, styles.modalSubmitButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>
                    同意して投稿
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  appBarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSection: {
    aspectRatio: 16 / 9,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: Spacing.sm,
    fontSize: 14,
  },
  formContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  fieldContainer: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    gap: Spacing.sm,
  },
  selectWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  selectOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ingredientInputs: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  ingredientName: {
    flex: 2,
    padding: Spacing.md,
    fontSize: 14,
  },
  divider: {
    width: 1,
    marginVertical: Spacing.sm,
  },
  ingredientAmount: {
    flex: 1,
    minWidth: 80,
    padding: Spacing.md,
    fontSize: 14,
    textAlign: 'right',
  },
  removeButton: {
    padding: Spacing.sm,
  },
  // 栄養情報スタイル
  nutritionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  nutritionField: {
    flex: 1,
    minWidth: 100,
  },
  nutritionLabel: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  nutritionInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  nutritionInput: {
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
  nutritionUnit: {
    fontSize: 14,
    marginLeft: Spacing.xs,
  },
  // タグスタイル
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  draftButton: {
    borderWidth: 2,
  },
  submitButton: {},
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // 投稿規定モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalNotice: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalNoticeText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  modalNoticeList: {
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalThanks: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalSubmitButton: {},
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

