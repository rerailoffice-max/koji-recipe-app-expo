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

// API Base URL - 開発用（テスト用）
const API_BASE_URL = 'https://koji-recipe-app-c72x.vercel.app';

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
}

// 麹の種類
const KOJI_TYPES = [
  { value: '中華麹', label: '中華風こうじ' },
  { value: 'コンソメ麹', label: 'コンソメ風こうじ' },
  { value: 'たまねぎ麹', label: '旨塩風こうじ' },
];

// 難易度
const DIFFICULTIES = [
  { value: 'かんたん', label: 'かんたん' },
  { value: 'ふつう', label: 'ふつう' },
  { value: 'むずかしい', label: 'むずかしい' },
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
  const params = useLocalSearchParams<{
    draftId?: string;
    title?: string;
    description?: string;
    koji_type?: string;
    difficulty?: string;
    ingredients?: string;
    steps?: string;
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
  });

  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [draftId, setDraftId] = React.useState<string | null>(null);

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
        image_url: null,
      });
    }

    if (draftIdParam) {
      setDraftId(draftIdParam);
    }
  }, [params.title, params.ingredients, params.steps, params.draftId, params.description, params.koji_type, params.difficulty]);

  const { takePhoto, pickFromLibrary } = useImagePicker();

  // 画像選択
  const handlePickImage = async () => {
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
      Alert.alert('エラー', '下書きを保存するにはタイトルを入力してください');
      return;
    }

    setIsSavingDraft(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        router.push('/login');
        return;
      }

      const cleanData = buildCleanData();

      const postData = {
        user_id: user.id,
        title: cleanData.title,
        description: cleanData.description,
        koji_type: cleanData.koji_type,
        difficulty: cleanData.difficulty,
        ingredients: cleanData.ingredients,
        steps: cleanData.steps,
        image_url: formData.image_url,
        is_public: false,
        is_ai_generated: false,
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

      Alert.alert('保存完了', '下書きを保存しました');
    } catch (e: any) {
      console.error('Save draft error:', e);
      Alert.alert('エラー', e?.message || '下書きの保存に失敗しました');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // 投稿
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('エラー', 'ログインが必要です');
        router.push('/login');
        return;
      }

      const cleanData = buildCleanData();

      const postData = {
        user_id: user.id,
        title: cleanData.title,
        description: cleanData.description,
        koji_type: cleanData.koji_type,
        difficulty: cleanData.difficulty,
        ingredients: cleanData.ingredients,
        steps: cleanData.steps,
        image_url: formData.image_url,
        is_public: true,
        is_ai_generated: false,
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

      Alert.alert('投稿完了', 'レシピを投稿しました', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e: any) {
      console.error('Submit error:', e);
      Alert.alert('エラー', e?.message || '投稿に失敗しました');
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
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                下書き保存
              </Text>
            )}
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || isSavingDraft}
            style={[
              styles.actionButton,
              styles.submitButton,
              { backgroundColor: colors.primary },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.actionButtonText, { color: colors.primaryForeground }]}>
                投稿する
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    flex: 1,
    padding: Spacing.md,
    fontSize: 16,
  },
  divider: {
    width: 1,
    marginVertical: Spacing.sm,
  },
  ingredientAmount: {
    width: 100,
    padding: Spacing.md,
    fontSize: 16,
    textAlign: 'right',
  },
  removeButton: {
    padding: Spacing.sm,
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
  draftButton: {
    borderWidth: 2,
  },
  submitButton: {},
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

