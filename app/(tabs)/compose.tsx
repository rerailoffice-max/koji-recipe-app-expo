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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  ChatMessageBubble,
  QuickReplyChips,
  ComposerBar,
  type ChatAttachment,
  type QuickReply,
} from '@/components/chat';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useImagePicker } from '@/hooks/use-image-picker';

// API Base URL（app.json の extra から取得）
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://koji-recipe-app-c72x.vercel.app';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  attachments?: ChatAttachment[];
}

// 初期挨拶
const INITIAL_GREETING = 'こんにちは！麹のこうちゃんだよ🌸\n今日は何を作ろうか？料理名や食材を教えてね！';

export default function ComposeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // チャット状態
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    { id: 'ai-hello', role: 'ai', text: INITIAL_GREETING },
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

    // ユーザーメッセージを追加
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || (attachment ? 'この写真で料理を考えてください。' : ''),
      attachments: attachment ? [attachment] : undefined,
    };

    // 「考え中...」のAIメッセージを追加
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
        kojiType: '中華こうじ', // デフォルト
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

      // AIの返答を更新
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
      setInput(reply.text);
      // 少し遅延させて送信（UX向上）
      setTimeout(() => {
        handleSendWithText(reply.text);
      }, 50);
    },
    [isThinking]
  );

  // テキスト指定で送信
  const handleSendWithText = React.useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return;

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
    },
    [isThinking, messages]
  );

  // 画像ピッカー
  const { takePhoto, pickFromLibrary } = useImagePicker();

  // 添付ボタン押下
  const handlePressAttach = React.useCallback(() => {
    setShowAttachSheet(true);
  }, []);

  // カメラで撮影
  const handleTakePhoto = React.useCallback(async () => {
    setShowAttachSheet(false);
    const attachment = await takePhoto();
    if (attachment) {
      setPendingAttachment(attachment);
    }
  }, [takePhoto]);

  // ライブラリから選択
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

  // 最後のメッセージがAIで、thinking中でなければチップを表示
  const lastMsg = messages[messages.length - 1];
  const shouldShowChips = lastMsg?.role === 'ai' && !isThinking && suggestions.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
            {/* チップ */}
            {shouldShowChips && (
              <QuickReplyChips
                replies={suggestions}
                onPress={handleChipPress}
                disabled={isThinking}
              />
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

      {/* 添付アクションシート（モーダル） */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: Spacing.md,
  },
  thinkingWrapper: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
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
