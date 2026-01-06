import React from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Text,
  Modal,
  Pressable,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  ChatMessageBubble,
  QuickReplyChips,
  ComposerBar,
  type ChatAttachment,
  type QuickReply,
} from '@/components/chat';
import { AppBar } from '@/components/ui/AppBar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useImagePicker } from '@/hooks/use-image-picker';
import { supabase } from '@/lib/supabase';

// API Base URL
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://koji-recipe-app-c72x.vercel.app';

// 下書きの型
interface Draft {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  attachments?: ChatAttachment[];
}

// クイックプロンプト
const QUICK_PROMPTS = [
  { id: '5分で簡単レシピ', label: '5分で簡単レシピ' },
  { id: '材料1つでできる', label: '材料1つでできる' },
  { id: '主菜（メイン）', label: '主菜（メイン）' },
  { id: '副菜（サブ）', label: '副菜（サブ）' },
  { id: '汁物', label: '汁物' },
];

// 初期挨拶を生成（季節の食材付き）
function generateGreeting(): string {
  const month = new Date().getMonth() + 1;
  let seasonalIngredients = '';
  
  if (month >= 1 && month <= 2) {
    seasonalIngredients = 'れんこん・カキ・里芋';
  } else if (month >= 3 && month <= 5) {
    seasonalIngredients = 'たけのこ・新玉ねぎ・春キャベツ';
  } else if (month >= 6 && month <= 8) {
    seasonalIngredients = 'トマト・きゅうり・なす';
  } else if (month >= 9 && month <= 10) {
    seasonalIngredients = 'さつまいも・きのこ・さんま';
  } else {
    seasonalIngredients = '白菜・大根・ブリ';
  }

  return `おはよう！\nこうじのコウちゃんだよ！\n\n${month}月の旬: ${seasonalIngredients} とかがおすすめ😊\n\n今日はどんな料理を作りたい？\n下の「例」や「使うこうじ」を選んでね！`;
}

// 事前生成されたメニュー案の型
type PreGeneratedMenus = Record<string, { menuIdea: string; kojiType: string }>;

export default function ComposeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 会話が開始されたかどうか
  const [hasStarted, setHasStarted] = React.useState(false);
  
  // 選択されたクイックプロンプト
  const [selectedQuickPrompt, setSelectedQuickPrompt] = React.useState<string | null>(null);
  
  // 事前生成されたメニュー案
  const [preGeneratedMenus, setPreGeneratedMenus] = React.useState<PreGeneratedMenus | null>(null);
  const preGenerateMenusInFlightRef = React.useRef(false);
  
  // メニュー例テキスト（クイックプロンプト選択時に表示）
  const [exampleText, setExampleText] = React.useState<string | null>(null);
  const [introStatus, setIntroStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  
  // 下書き生成中フラグ
  const [isGeneratingDraft, setIsGeneratingDraft] = React.useState(false);
  
  // 下書き一覧
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = React.useState(false);
  const [showDraftsModal, setShowDraftsModal] = React.useState(false);

  // チャット状態
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: 'ai-hello', role: 'ai', text: generateGreeting() },
  ]);
  const [input, setInput] = React.useState('');
  const [isThinking, setIsThinking] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<QuickReply[]>([]);

  // 画像添付状態
  const [pendingAttachment, setPendingAttachment] = React.useState<ChatAttachment | null>(null);
  const [showAttachSheet, setShowAttachSheet] = React.useState(false);

  // FlatListのref
  const flatListRef = React.useRef<FlatList>(null);
  
  // ページ読み込み時に全カテゴリのメニュー案を事前生成
  React.useEffect(() => {
    if (preGeneratedMenus !== null) return; // 既に生成済み
    if (preGenerateMenusInFlightRef.current) return;

    const loadAllMenuIdeas = async () => {
      preGenerateMenusInFlightRef.current = true;
      try {
        const res = await fetch(`${API_BASE_URL}/api/quick-menu-idea`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allCategories: true }),
        });
        const json = await res.json().catch(() => null);
        
        if (res.ok && json?.success && json?.results) {
          setPreGeneratedMenus((prev) => (prev ? prev : json.results));
        }
      } catch (e) {
        console.error('Failed to pre-generate menu ideas:', e);
      } finally {
        preGenerateMenusInFlightRef.current = false;
      }
    };

    void loadAllMenuIdeas();
  }, [preGeneratedMenus]);
  
  // 事前生成が完了したら、選択中のカテゴリの内容で更新
  React.useEffect(() => {
    if (!selectedQuickPrompt) return;
    if (!preGeneratedMenus) return;
    
    const preGenerated = preGeneratedMenus[selectedQuickPrompt];
    if (preGenerated?.menuIdea) {
      setExampleText(preGenerated.menuIdea);
      setIntroStatus('ready');
    }
  }, [preGeneratedMenus, selectedQuickPrompt]);

  // メッセージが増えたら自動スクロール
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // 内部送信関数（isQuickRecipeModeを明示的に指定）
  const handleSendInternal = React.useCallback(async (
    text: string,
    isQuickRecipeMode: boolean,
    attachments?: ChatAttachment[]
  ) => {
    if (!text && (!attachments || attachments.length === 0)) return;
    if (isThinking || isGeneratingDraft) return;

    setHasStarted(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || (attachments?.length ? 'この写真で料理を考えてください。' : ''),
      attachments: attachments,
    };

    const pendingAiId = `a-${Date.now() + 1}`;
    const pendingAiMsg: ChatMessage = {
      id: pendingAiId,
      role: 'ai',
      text: isQuickRecipeMode ? 'レシピを考案中...' : '考え中...',
    };

    setMessages((prev) => [...prev, userMsg, pendingAiMsg]);
    setInput('');
    setPendingAttachment(null);
    setIsThinking(true);
    setSuggestions([]);

    try {
      const isFirstTurn = messages.filter((m) => m.role === 'user').length === 0;

      const payload = {
        kojiType: '中華こうじ',
        messages: [...messages, userMsg].map((m) => ({
          role: m.role,
          text: m.text,
          attachments:
            m.id === userMsg.id && m.role === 'user' && m.attachments?.length
              ? m.attachments
                  .filter((a) => a.kind === 'image')
                  .slice(0, 1)
                  .map((a) => ({ kind: a.kind, mimeType: a.mimeType, dataBase64: a.dataBase64 }))
              : undefined,
        })),
        firstTurn: isFirstTurn,
        isQuickRecipeMode,
      };

      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      const aiText =
        res.ok && json?.success && typeof json?.reply === 'string'
          ? json.reply
          : 'ごめんね、うまく返答できなかったよ。もう一度送ってみて！';

      const newSuggestions: QuickReply[] = Array.isArray(json?.suggestions)
        ? json.suggestions
            .filter((s: any) => s?.label && s?.text)
            .slice(0, 8)
            .map((s: any, idx: number) => ({
              id: `sug-${idx}`,
              label: String(s.label),
              text: String(s.text),
            }))
        : [];

      setMessages((prev) =>
        prev.map((m) => (m.id === pendingAiId ? { ...m, text: aiText } : m))
      );
      setSuggestions(newSuggestions);
    } catch (e) {
      console.error('Chat API error:', e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingAiId ? { ...m, text: '通信に失敗しました。もう一度送ってみて！' } : m
        )
      );
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, isGeneratingDraft, messages]);

  // 通常のチャット送信（isQuickRecipeMode: false）
  const handleSend = React.useCallback(async () => {
    const text = input.trim();
    const attachment = pendingAttachment;
    await handleSendInternal(
      text || (attachment ? 'この写真で料理を考えてください。' : ''),
      false,
      attachment ? [attachment] : undefined
    );
  }, [input, pendingAttachment, handleSendInternal]);

  // クイックプロンプト経由での送信（isQuickRecipeMode: true）
  const handleSendWithQuickRecipeMode = React.useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking || isGeneratingDraft) return;
      await handleSendInternal(text, true, undefined);
    },
    [handleSendInternal, isThinking, isGeneratingDraft]
  );

  // チップをタップして送信
  const handleChipPress = React.useCallback(
    (reply: QuickReply) => {
      if (isThinking || isGeneratingDraft) return;
      
      // 「いい感じ、下書きして」チップの場合は下書き生成
      if (reply.label.includes('下書き') || reply.text.includes('下書き')) {
        handleGenerateDraft();
        return;
      }
      
      // 通常のチップは通常送信
      handleSendInternal(reply.text, false, undefined);
    },
    [isThinking, isGeneratingDraft, handleSendInternal]
  );

  // 下書き生成してフォーム画面へ遷移
  const handleGenerateDraft = React.useCallback(async () => {
    if (isGeneratingDraft || isThinking) return;
    
    setIsGeneratingDraft(true);
    setSuggestions([]); // チップを非表示にする
    
    // ユーザーメッセージを追加（チップをタップしたことを表現）
    const userMsgId = `u-draft-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: 'いい感じ、下書きして',
    };
    
    // ローディングメッセージを追加
    const loadingMsgId = `a-draft-${Date.now() + 1}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: loadingMsgId, role: 'ai', text: 'レシピを下書きに作成中...' },
    ]);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kojiType: '中華こうじ',
          difficulty: 'かんたん',
          additionalRequirements: '家庭向けに簡単で美味しく。麹の使いどころを明確に。',
        }),
      });
      
      const json = await res.json().catch(() => null);
      
      if (res.ok && json?.success && json?.recipe) {
        const recipe = json.recipe;
        
        // 成功メッセージを表示
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, text: `「${recipe.title}」のレシピを作成しました！\n編集画面に移動します...` }
              : m
          )
        );
        setSuggestions([]);
        
        // フォーム画面へ遷移（生成されたレシピデータを渡す）
        setTimeout(() => {
          router.push({
            pathname: '/compose/edit',
            params: {
              title: recipe.title || '',
              description: recipe.description || '',
              koji_type: recipe.koji_type || '中華麹',
              difficulty: recipe.difficulty || 'かんたん',
              ingredients: JSON.stringify(recipe.ingredients || []),
              steps: JSON.stringify(recipe.steps || []),
            },
          });
        }, 1000);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, text: json?.error || 'レシピの作成に失敗しました。もう一度お試しください。' }
              : m
          )
        );
      }
    } catch (e) {
      console.error('Generate draft error:', e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsgId
            ? { ...m, text: '通信に失敗しました。もう一度お試しください。' }
            : m
        )
      );
    } finally {
      setIsGeneratingDraft(false);
    }
  }, [isGeneratingDraft, isThinking, router]);
  
  // スキップしてフォーム画面へ遷移
  const handleSkipToForm = React.useCallback(() => {
    router.push('/compose/edit');
  }, [router]);
  
  // 下書き一覧を読み込み
  const loadDrafts = React.useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDrafts([]);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('id, title, updated_at, created_at')
        .eq('user_id', user.id)
        .eq('is_public', false)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading drafts:', error);
        setDrafts([]);
        return;
      }

      setDrafts((data ?? []) as Draft[]);
    } catch (e) {
      console.error('Load drafts error:', e);
      setDrafts([]);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, []);
  
  // 下書きモーダルを開く
  const handleOpenDrafts = React.useCallback(() => {
    setShowDraftsModal(true);
    loadDrafts();
  }, [loadDrafts]);
  
  // 下書きを再開
  const handleResumeDraft = React.useCallback(async (draftId: string) => {
    setShowDraftsModal(false);
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error || !data) {
        Alert.alert('エラー', '下書きの読み込みに失敗しました');
        return;
      }

      // フォーム画面へ遷移（下書きデータを渡す）
      router.push({
        pathname: '/compose/edit',
        params: {
          draftId: data.id,
          title: data.title || '',
          description: data.description || '',
          koji_type: data.koji_type || '中華麹',
          difficulty: data.difficulty || 'かんたん',
          ingredients: JSON.stringify(data.ingredients || []),
          steps: JSON.stringify(data.steps || []),
        },
      });
    } catch (e) {
      console.error('Resume draft error:', e);
      Alert.alert('エラー', '下書きの読み込みに失敗しました');
    }
  }, [router]);

  // クイックプロンプト選択（事前生成済みメニューを表示）
  const handleSelectQuickPrompt = React.useCallback((promptId: string) => {
    setSelectedQuickPrompt(promptId);
    
    // 事前生成済みメニューがあれば即座に表示
    const preGenerated = preGeneratedMenus?.[promptId];
    if (preGenerated?.menuIdea) {
      setExampleText(preGenerated.menuIdea);
      setIntroStatus('ready');
      return;
    }
    
    // まだ生成中の場合はローディング表示
    setExampleText(null);
    setIntroStatus('loading');
  }, [preGeneratedMenus]);
  
  // メニュー例をタップして即レシピモードで送信
  const handleTapExample = React.useCallback((text: string) => {
    handleSendWithQuickRecipeMode(text);
  }, [handleSendWithQuickRecipeMode]);

  // 画像ピッカー
  const { takePhoto, pickFromLibrary } = useImagePicker();

  const handlePressAttach = React.useCallback(() => {
    setShowAttachSheet(true);
  }, []);

  const handleTakePhoto = React.useCallback(async () => {
    setShowAttachSheet(false);
    const attachment = await takePhoto();
    if (attachment) {
      setPendingAttachment(attachment);
    }
  }, [takePhoto]);

  const handlePickFromLibrary = React.useCallback(async () => {
    setShowAttachSheet(false);
    const attachment = await pickFromLibrary();
    if (attachment) {
      setPendingAttachment(attachment);
    }
  }, [pickFromLibrary]);

  // レンダーアイテム
  const renderMessage = React.useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatMessageBubble
        role={item.role}
        text={item.text}
        aiAvatarSrc={`${API_BASE_URL}/ai/kochan.png`}
        attachments={item.attachments}
      />
    ),
    []
  );

  const keyExtractor = React.useCallback((item: ChatMessage) => item.id, []);

  const lastMsg = messages[messages.length - 1];
  const shouldShowChips = lastMsg?.role === 'ai' && !isThinking && suggestions.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AppBar */}
      <AppBar
        title="レシピを考える"
        leftAction={
          <Pressable
            onPress={() => router.back()}
            style={styles.appBarButton}
          >
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </Pressable>
        }
        rightAction={
          <Pressable
            onPress={handleSkipToForm}
            style={styles.appBarButton}
          >
            <Text style={[styles.skipText, { color: colors.text }]}>スキップ</Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* メッセージ一覧 */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 16 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {/* ローディング */}
              {isThinking && (
                <View style={styles.thinkingWrapper}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              {/* AIの返答後のチップ */}
              {shouldShowChips && (
                <QuickReplyChips
                  replies={suggestions}
                  onPress={handleChipPress}
                  disabled={isThinking}
                />
              )}

              {/* 会話開始前のクイックプロンプト */}
              {!hasStarted && (
                <View style={styles.quickPromptsSection}>
                  {/* AIに聞いてみる */}
                  <View style={styles.quickPromptsHeader}>
                    <Text style={[styles.quickPromptsLabel, { color: colors.mutedForeground }]}>
                      💡 AIに聞いてみる
                    </Text>
                  </View>
                  <View style={styles.quickPromptsGrid}>
                    {QUICK_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt.id}
                        onPress={() => handleSelectQuickPrompt(prompt.id)}
                        disabled={isThinking || isGeneratingDraft}
                        style={[
                          styles.quickPromptChip,
                          {
                            borderColor: selectedQuickPrompt === prompt.id
                              ? colors.primary
                              : `${colors.primary}4D`,
                            backgroundColor: selectedQuickPrompt === prompt.id
                              ? `${colors.primary}1A`
                              : `${colors.primary}0D`,
                          },
                        ]}
                      >
                        <Text style={[styles.quickPromptText, { color: colors.primary }]}>
                          {prompt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  
                  {/* 選択されたカテゴリのメニュー例 */}
                  {selectedQuickPrompt && (
                    <View style={styles.exampleSection}>
                      {introStatus === 'loading' && (
                        <View style={styles.exampleLoading}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={[styles.exampleLoadingText, { color: colors.mutedForeground }]}>
                            メニュー例を生成中...
                          </Text>
                        </View>
                      )}
                      {introStatus === 'ready' && exampleText && (
                        <Pressable
                          onPress={() => handleTapExample(exampleText)}
                          disabled={isThinking || isGeneratingDraft}
                          style={[
                            styles.exampleCard,
                            {
                              borderColor: colors.primary,
                              backgroundColor: colors.surface,
                            },
                          ]}
                        >
                          <View style={styles.exampleCardHeader}>
                            <Text style={[styles.exampleLabel, { color: colors.primary }]}>
                              タップして送信 →
                            </Text>
                          </View>
                          <Text style={[styles.exampleText, { color: colors.text }]}>
                            {exampleText}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {/* 下書きから再開 */}
                  <Pressable
                    onPress={handleOpenDrafts}
                    style={styles.draftsLink}
                  >
                    <Text style={[styles.draftsLinkText, { color: colors.primary }]}>
                      下書きから再開
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          }
        />

        {/* 入力バー */}
        <ComposerBar
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          onPressAttach={handlePressAttach}
          pendingAttachment={pendingAttachment}
          onRemoveAttachment={() => setPendingAttachment(null)}
          disabled={isThinking}
        />
      </KeyboardAvoidingView>

      {/* 添付アクションシート */}
      <Modal
        visible={showAttachSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachSheet(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAttachSheet(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.surface }]}>
            <Pressable
              style={[styles.actionSheetItem, { borderBottomColor: colors.border }]}
              onPress={handleTakePhoto}
            >
              <Text style={[styles.actionSheetText, { color: colors.text }]}>
                写真を撮影する
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionSheetItem, { borderBottomColor: colors.border }]}
              onPress={handlePickFromLibrary}
            >
              <Text style={[styles.actionSheetText, { color: colors.text }]}>
                写真を添付する
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionSheetItem}
              onPress={() => setShowAttachSheet(false)}
            >
              <Text style={[styles.actionSheetText, { color: colors.mutedForeground }]}>
                キャンセル
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* 下書き一覧モーダル */}
      <Modal
        visible={showDraftsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDraftsModal(false)}
      >
        <View style={[styles.draftsModalContainer, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.draftsModalContent, { backgroundColor: colors.background }]}>
            {/* ヘッダー */}
            <View style={[styles.draftsModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.draftsModalTitle, { color: colors.text }]}>
                下書き一覧
              </Text>
              <Pressable
                onPress={() => setShowDraftsModal(false)}
                style={styles.draftsModalClose}
              >
                <IconSymbol name="xmark" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* 下書きリスト */}
            {isLoadingDrafts ? (
              <View style={styles.draftsLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.draftsLoadingText, { color: colors.mutedForeground }]}>
                  読み込み中...
                </Text>
              </View>
            ) : drafts.length === 0 ? (
              <View style={styles.draftsEmpty}>
                <Text style={[styles.draftsEmptyText, { color: colors.mutedForeground }]}>
                  下書きはありません
                </Text>
                <Text style={[styles.draftsEmptyHint, { color: colors.mutedForeground }]}>
                  「下書き保存」でレシピを保存できます
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.draftsList}>
                {drafts.map((draft) => (
                  <Pressable
                    key={draft.id}
                    onPress={() => handleResumeDraft(draft.id)}
                    style={[styles.draftItem, { borderBottomColor: colors.border }]}
                  >
                    <View style={styles.draftItemContent}>
                      <Text style={[styles.draftTitle, { color: colors.text }]} numberOfLines={1}>
                        {draft.title || '（無題）'}
                      </Text>
                      <Text style={[styles.draftDate, { color: colors.mutedForeground }]}>
                        更新: {new Date(draft.updated_at || draft.created_at).toLocaleString('ja-JP')}
                      </Text>
                    </View>
                    <Text style={[styles.draftAction, { color: colors.primary }]}>
                      再開
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
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
  appBarButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingTop: Spacing.md,
  },
  thinkingWrapper: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  quickPromptsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  quickPromptsHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  quickPromptsLabel: {
    fontSize: 12,
  },
  quickPromptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  quickPromptChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  quickPromptText: {
    fontSize: 14,
    fontWeight: '500',
  },
  draftsLink: {
    alignItems: 'flex-end',
    paddingTop: Spacing.lg,
  },
  draftsLinkText: {
    fontSize: 14,
  },
  exampleSection: {
    marginTop: Spacing.lg,
  },
  exampleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  exampleLoadingText: {
    fontSize: 13,
  },
  exampleCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exampleCardHeader: {
    marginBottom: Spacing.sm,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  exampleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    margin: Spacing.sm,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  actionSheetItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  actionSheetText: {
    fontSize: 16,
    textAlign: 'center',
  },
  // 下書きモーダル
  draftsModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  draftsModalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  draftsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  draftsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  draftsModalClose: {
    padding: Spacing.sm,
  },
  draftsLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  draftsLoadingText: {
    fontSize: 14,
  },
  draftsEmpty: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  draftsEmptyText: {
    fontSize: 16,
  },
  draftsEmptyHint: {
    fontSize: 12,
  },
  draftsList: {
    flex: 1,
  },
  draftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  draftItemContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  draftDate: {
    fontSize: 12,
  },
  draftAction: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: Spacing.md,
  },
});
