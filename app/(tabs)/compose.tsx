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

// API Base URL
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://koji-recipe-app-c72x.vercel.app';

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

export default function ComposeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // 会話が開始されたかどうか
  const [hasStarted, setHasStarted] = React.useState(false);
  
  // 選択されたクイックプロンプト
  const [selectedQuickPrompt, setSelectedQuickPrompt] = React.useState<string | null>(null);

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

  // メッセージが増えたら自動スクロール
  React.useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // チャット送信
  const handleSend = React.useCallback(async () => {
    const text = input.trim();
    const attachment = pendingAttachment;

    if (!text && !attachment) return;
    if (isThinking) return;

    setHasStarted(true);

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || (attachment ? 'この写真で料理を考えてください。' : ''),
      attachments: attachment ? [attachment] : undefined,
    };

    const pendingAiId = `a-${Date.now() + 1}`;
    const pendingAiMsg: ChatMessage = {
      id: pendingAiId,
      role: 'ai',
      text: '考え中...',
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
        isQuickRecipeMode: false,
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
  }, [input, pendingAttachment, isThinking, messages]);

  // チップをタップして送信
  const handleChipPress = React.useCallback(
    (reply: QuickReply) => {
      if (isThinking) return;
      handleSendWithText(reply.text);
    },
    [isThinking]
  );

  // テキスト指定で送信
  const handleSendWithText = React.useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

      setHasStarted(true);

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
      };

      const pendingAiId = `a-${Date.now() + 1}`;
      const pendingAiMsg: ChatMessage = {
        id: pendingAiId,
        role: 'ai',
        text: '考え中...',
      };

      setMessages((prev) => [...prev, userMsg, pendingAiMsg]);
      setInput('');
      setIsThinking(true);
      setSuggestions([]);

      try {
        const isFirstTurn = messages.filter((m) => m.role === 'user').length === 0;

        const payload = {
          kojiType: '中華こうじ',
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            text: m.text,
          })),
          firstTurn: isFirstTurn,
          isQuickRecipeMode: !!selectedQuickPrompt,
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
    },
    [isThinking, messages, selectedQuickPrompt]
  );

  // クイックプロンプト選択
  const handleSelectQuickPrompt = React.useCallback((promptId: string) => {
    setSelectedQuickPrompt(promptId);
    // 選択後、自動で送信
    handleSendWithText(promptId);
  }, [handleSendWithText]);

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
            onPress={() => {
              // スキップ → フォーム画面へ（将来実装）
              console.log('Skip to form');
            }}
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
                        disabled={isThinking}
                        style={[
                          styles.quickPromptChip,
                          {
                            borderColor: `${colors.primary}4D`,
                            backgroundColor: `${colors.primary}0D`,
                          },
                        ]}
                      >
                        <Text style={[styles.quickPromptText, { color: colors.primary }]}>
                          {prompt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* 下書きから再開 */}
                  <Pressable
                    onPress={() => {
                      // 下書き一覧へ（将来実装）
                      console.log('Open drafts');
                    }}
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
});
