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
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useImagePicker } from '@/hooks/use-image-picker';
import { supabase } from '@/lib/supabase';

// API Base URL - 本番用
const API_BASE_URL = 'https://api.gochisokoji.com';

// チャットボット（GOCHISOシェフ）アバター：アプリ内画像を使用（キャッシュ/外部依存を回避）
const AI_AVATAR_SOURCE = require('../../assets/images/icon.png');

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

// 初期挨拶を生成（時間帯別・季節の食材付き）
function generateGreeting(): string {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  
  // 時間帯別の挨拶
  let greeting = '';
  if (hour >= 6 && hour < 11) {
    greeting = 'おはようございます！';
  } else if (hour >= 11 && hour < 17) {
    greeting = 'こんにちは！';
  } else {
    greeting = 'こんばんは！';
  }
  
  // 季節の食材
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

  return `${greeting}\nGOCHISOシェフです！\n\n${month}月の旬: ${seasonalIngredients}\n\n今日はどんなメニューを作りたいですか？\n下の「候補」から選ぶか、チャットで教えてね！`;
}

// 事前生成されたメニュー案の型（各カテゴリで3つの麹タイプのメニュー案）
type MenuIdea = {
  // 新API（JSON）
  title?: string;
  summary?: string;
  keyIngredients?: string[];
  steps?: string[];
  timeMinutes?: number;
  // 旧API（1行）
  menuIdea?: string;
  // 共通
  kojiType: string;
};
type PreGeneratedMenus = Record<string, { menuIdeas: MenuIdea[] }>;

type MenuIdeaCard = {
  kojiType: string;
  title: string;
  summary: string;
  keyIngredients: string[];
  steps: string[];
  timeMinutes?: number;
};

function normalizeMenuIdeaCard(input: MenuIdea): MenuIdeaCard | null {
  const kojiType = String(input?.kojiType ?? '').trim();
  if (!kojiType) return null;

  // 新API優先
  const titleFromJson = typeof input.title === 'string' ? input.title.trim() : '';
  const summaryFromJson = typeof input.summary === 'string' ? input.summary.trim() : '';
  const keyIngredientsFromJson = Array.isArray(input.keyIngredients)
    ? input.keyIngredients.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const stepsFromJson = Array.isArray(input.steps)
    ? input.steps.map((x) => String(x ?? '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const timeMinutes = typeof input.timeMinutes === 'number' && Number.isFinite(input.timeMinutes)
    ? Math.round(input.timeMinutes)
    : undefined;


  if (titleFromJson && summaryFromJson) {
    return {
      kojiType,
      title: titleFromJson,
      summary: summaryFromJson,
      keyIngredients: keyIngredientsFromJson,
      steps: stepsFromJson,
      ...(timeMinutes ? { timeMinutes } : {}),
    };
  }

  // 旧API（1行）をできるだけ分解して表示する
  const legacy = typeof input.menuIdea === 'string' ? input.menuIdea.trim() : '';
  if (!legacy) return null;
  const [t0, ...rest] = legacy.split('。');
  const title = (t0 || legacy).trim();
  const summary = rest.join('。').trim() || legacy;
  return {
    kojiType,
    title,
    summary,
    keyIngredients: [],
    steps: [],
  };
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
  
  // 事前生成されたメニュー案
  const [preGeneratedMenus, setPreGeneratedMenus] = React.useState<PreGeneratedMenus | null>(null);
  const preGenerateMenusInFlightRef = React.useRef(false);
  const menuAbortRef = React.useRef<AbortController | null>(null);
  
  // メニュー例（クイックプロンプト選択時に表示する3つの候補）
  const [exampleMenus, setExampleMenus] = React.useState<MenuIdeaCard[] | null>(null);
  const [introStatus, setIntroStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [introErrorText, setIntroErrorText] = React.useState<string | null>(null);
  const [introRetryUntilMs, setIntroRetryUntilMs] = React.useState<number | null>(null);
  
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
  const chatAbortRef = React.useRef<AbortController | null>(null);
  const extractAbortRef = React.useRef<AbortController | null>(null);

  // 画像添付状態
  const [pendingAttachment, setPendingAttachment] = React.useState<ChatAttachment | null>(null);
  const [showAttachSheet, setShowAttachSheet] = React.useState(false);

  // FlatListのref
  const flatListRef = React.useRef<FlatList>(null);
  
  // ページ読み込み時に全カテゴリのメニュー案を事前生成（allCategories: true で1回のAPI呼び出し）
  React.useEffect(() => {
    // 既に取得済みなら何もしない
    if (preGeneratedMenus !== null) return;
    if (preGenerateMenusInFlightRef.current) return;

    const loadAllCategories = async () => {
      preGenerateMenusInFlightRef.current = true;
      try { menuAbortRef.current?.abort(); } catch {}
      const controller = new AbortController();
      menuAbortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE_URL}/api/quick-menu-idea`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ allCategories: true }),
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success && json?.results) {
          // 全カテゴリの結果をキャッシュ
          setPreGeneratedMenus(json.results as PreGeneratedMenus);
        }
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('Failed to preload all categories:', e);
      } finally {
        preGenerateMenusInFlightRef.current = false;
      }
    };

    void loadAllCategories();
  }, [preGeneratedMenus]);
  
  // 事前生成が完了したら、選択中のカテゴリの内容で更新
  React.useEffect(() => {
    if (!selectedQuickPrompt) return;
    if (!preGeneratedMenus) return;
    
    const preGenerated = preGeneratedMenus[selectedQuickPrompt];
    if (preGenerated?.menuIdeas && preGenerated.menuIdeas.length > 0) {
      const normalized = preGenerated.menuIdeas
        .map(normalizeMenuIdeaCard)
        .filter((x): x is MenuIdeaCard => !!x);
      if (normalized.length > 0) {
        setExampleMenus(normalized);
        setIntroStatus('ready');
      }
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
        kojiType: '', // AIがメッセージ内容から自動判定
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


      let res: Response;
      try {
        // 直前のチャット生成が残っていれば中断（連打/リセット対策）
        try { chatAbortRef.current?.abort(); } catch {}
        const controller = new AbortController();
        chatAbortRef.current = controller;
        res = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (fetchErr: any) {
        if (fetchErr?.name === 'AbortError') {
          return;
        }
        throw fetchErr;
      }


      let json: any = null;
      try {
        json = await res.json();
      } catch (parseErr: any) {
      }


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
    
    // 送信前に即座に入力をクリア（UIの即時反映）
    setInput('');
    setPendingAttachment(null);
    
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

  // 下書き生成してフォーム画面へ遷移（会話からレシピを抽出）
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
    const currentMessages = [...messages, userMsg];
    setMessages([
      ...currentMessages,
      { id: loadingMsgId, role: 'ai', text: 'レシピを下書きに作成中...' },
    ]);
    
    try {
      // 直前の抽出が残っていれば中断
      try { extractAbortRef.current?.abort(); } catch {}
      const controller = new AbortController();
      extractAbortRef.current = controller;
      // 会話履歴からレシピを抽出するAPIを呼び出し
      const res = await fetch(`${API_BASE_URL}/api/extract-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
        signal: controller.signal,
      });
      
      const json = await res.json().catch(() => null);
      
      if (res.ok && json?.success && json?.recipe) {
        const recipe = json.recipe;
        
        // 成功メッセージを表示
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, text: `「${recipe.title}」の下書きを作成しました！\n編集画面に移動します...` }
              : m
          )
        );
        setSuggestions([]);
        
        // 会話履歴から画像を探す（最新の画像を使用）
        let imageBase64 = '';
        for (let i = currentMessages.length - 1; i >= 0; i--) {
          const msg = currentMessages[i];
          if (msg.attachments && msg.attachments.length > 0) {
            const imgAttachment = msg.attachments.find(a => a.kind === 'image');
            if (imgAttachment && imgAttachment.dataBase64) {
              imageBase64 = imgAttachment.dataBase64;
              break;
            }
          }
        }
        
        // フォーム画面へ遷移（抽出されたレシピデータと画像を渡す）
        setTimeout(() => {
          router.push({
            pathname: '/compose/edit',
            params: {
              title: recipe.title || '',
              description: recipe.description || '',
              koji_type: recipe.koji_type || '',
              difficulty: recipe.difficulty || 'かんたん',
              ingredients: JSON.stringify(recipe.ingredients || []),
              steps: JSON.stringify(recipe.steps || []),
              tips: recipe.tips || '',
              image_base64: imageBase64 || '',
            },
          });
        }, 1000);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsgId
              ? { ...m, text: json?.error || 'レシピの抽出に失敗しました。もう一度お試しください。' }
              : m
          )
        );
      }
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        return;
      }
      console.error('Extract recipe error:', e);
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
  }, [isGeneratingDraft, isThinking, messages, router]);
  
  // スキップしてフォーム画面へ遷移
  const handleSkipToForm = React.useCallback(() => {
    router.push('/compose/edit');
  }, [router]);

  // チャットをリセット
  const handleResetChat = React.useCallback(() => {
    const runId = `reset_${Date.now()}`;

    const doReset = () => {

      // 進行中リクエストを中断（リセット後にレスポンスが戻ってstateが巻き戻るのを防ぐ）
      try { chatAbortRef.current?.abort(); } catch {}
      chatAbortRef.current = null;
      try { menuAbortRef.current?.abort(); } catch {}
      menuAbortRef.current = null;
      try { extractAbortRef.current?.abort(); } catch {}
      extractAbortRef.current = null;
      preGenerateMenusInFlightRef.current = false;

      setMessages([{ id: 'ai-hello', role: 'ai', text: generateGreeting() }]);
      setHasStarted(false);
      setSuggestions([]);
      setSelectedQuickPrompt(null);
      setExampleMenus(null);
      setIntroStatus('idle');
      setIntroErrorText(null);
      setIntroRetryUntilMs(null);
      setInput('');
      setPendingAttachment(null);
      setShowAttachSheet(false);
      setIsThinking(false);
      setIsGeneratingDraft(false);
      // 完全リセット：メニューキャッシュも破棄
      setPreGeneratedMenus(null);
    };

    // Web(PWA)は Alert.alert が効かない/確認が出ないことがあるため即リセット
    if (Platform.OS === 'web') {
      doReset();
      return;
    }

    Alert.alert(
      'チャットをリセット',
      '会話をリセットしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: () => {
            doReset();
          },
        },
      ]
    );
  }, []);
  
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
          koji_type: data.koji_type || '',
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

  // クイックプロンプト選択（キャッシュがあれば即座に表示、なければローディング）
  const handleSelectQuickPrompt = React.useCallback((promptId: string) => {
    setSelectedQuickPrompt(promptId);
    setIntroErrorText(null);
    setIntroRetryUntilMs(null);

    // キャッシュがあれば即座に表示（APIコールなし）
    const cached = preGeneratedMenus?.[promptId];
    if (cached?.menuIdeas && cached.menuIdeas.length > 0) {
      const normalized = cached.menuIdeas
        .map(normalizeMenuIdeaCard)
        .filter((x): x is MenuIdeaCard => !!x);
      if (normalized.length > 0) {
        setExampleMenus(normalized);
        setIntroStatus('ready');
        return;
      }
    }

    // キャッシュがない場合はローディング表示（事前生成が完了するまで待つ）
    setExampleMenus(null);
    setIntroStatus('loading');
  }, [preGeneratedMenus]);
  
  // メニュー例をタップして即レシピモードで送信
  const handleTapExample = React.useCallback((idea: MenuIdeaCard) => {
    const ingredientsText =
      idea.keyIngredients && idea.keyIngredients.length > 0
        ? `材料は ${idea.keyIngredients.join('、')} です。`
        : '';
    const stepsText =
      idea.steps && idea.steps.length > 0
        ? `手順は ${idea.steps.slice(0, 4).join(' / ')}。`
        : '';
    const timeText = typeof idea.timeMinutes === 'number' ? `目安 ${idea.timeMinutes}分。` : '';
    const msg = `「${idea.title}」を作りたいです。${idea.kojiType}を使って、${ingredientsText}${timeText}\n${idea.summary}\n${stepsText}\n分量（2人分）とコツも教えて。`;
    handleSendWithQuickRecipeMode(msg);
  }, [handleSendWithQuickRecipeMode, isThinking, isGeneratingDraft]);

  // メニュー生成を再試行
  const handleRetryMenuGeneration = React.useCallback(async () => {
    setIntroStatus('loading');
    setIntroErrorText(null);
    preGenerateMenusInFlightRef.current = false;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/quick-menu-idea`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedQuickPrompt ? { promptCategory: selectedQuickPrompt } : { allCategories: true }),
      });
      const json = await res.json().catch(() => null);

      const menuIdeasFromBody =
        json?.menuIdeas && Array.isArray(json.menuIdeas)
          ? (json.menuIdeas as MenuIdea[])
              .map(normalizeMenuIdeaCard)
              .filter((x): x is MenuIdeaCard => !!x)
          : null;
      if (res.ok && json?.success && menuIdeasFromBody && menuIdeasFromBody.length > 0) {
        setExampleMenus(menuIdeasFromBody);
        setIntroStatus('ready');
        return;
      }

      const detailsText = typeof json?.details === 'string' ? json.details : '';
      const errorText = typeof json?.error === 'string' ? json.error : '';
      const isQuota = detailsText.includes('Quota exceeded') || res.status === 429;
      const m = detailsText.match(/retry in\\s+([0-9.]+)\\s*s/i);
      const retrySeconds = m?.[1] ? Number(m[1]) : null;
      if (isQuota && retrySeconds && Number.isFinite(retrySeconds)) {
        setIntroRetryUntilMs(Date.now() + Math.ceil(retrySeconds * 1000));
      }
      setIntroErrorText(
        isQuota
          ? retrySeconds && Number.isFinite(retrySeconds)
            ? `AIの呼び出し上限に達しました。${Math.ceil(retrySeconds)}秒ほど待ってから再試行してください。`
            : 'AIの呼び出し上限に達しました。少し待ってから再試行してください。'
          : errorText || '生成に失敗しました。少し待ってから再試行してください。'
      );
      setIntroStatus('error');
    } catch (e) {
      console.error('Retry failed:', e);
      setIntroErrorText('通信に失敗しました。少し待ってから再試行してください。');
      setIntroStatus('error');
    }
  }, [selectedQuickPrompt]);

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
        aiAvatarSrc={AI_AVATAR_SOURCE}
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
            onPress={handleResetChat}
            style={styles.appBarButton}
          >
            <IconSymbol name="arrow.counterclockwise" size={20} color={colors.text} />
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
                      {introStatus === 'error' && (
                        <View style={styles.exampleLoading}>
                          <Text style={[styles.exampleLoadingText, { color: colors.mutedForeground }]}>
                            {introErrorText ?? '生成に失敗しました'}
                          </Text>
                          <Pressable
                            onPress={handleRetryMenuGeneration}
                            disabled={!!introRetryUntilMs && introRetryUntilMs > Date.now()}
                            style={[styles.retryButton, { borderColor: colors.primary }]}
                          >
                            <Text style={[styles.retryButtonText, { color: colors.primary }]}>
                              {introRetryUntilMs && introRetryUntilMs > Date.now()
                                ? `待機中… ${Math.ceil((introRetryUntilMs - Date.now()) / 1000)}秒`
                                : '再試行'}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                      {introStatus === 'ready' && exampleMenus && exampleMenus.length > 0 && (
                        <View style={styles.exampleWrapper}>
                          <Text style={[styles.exampleLabel, { color: colors.primary }]}>
                            タップして送信 →
                          </Text>
                          {exampleMenus.map((menu, index) => {
                            // 麹タイプに応じた絵文字とラベル
                            const kojiLabel = menu.kojiType.includes('旨塩') ? '🧅 旨塩'
                              : menu.kojiType.includes('コンソメ') ? '🥕 コンソメ'
                              : '🧄 中華';
                            
                            return (
                              <View key={index} style={styles.exampleCardWrapper}>
                                <Text style={[styles.kojiLabel, { color: colors.mutedForeground }]}>
                                  {kojiLabel}
                                </Text>
                                <Pressable
                                  onPress={() => handleTapExample(menu)}
                                  disabled={isThinking || isGeneratingDraft}
                                  style={[
                                    styles.exampleCard,
                                    {
                                      borderColor: colors.primary,
                                      backgroundColor: colors.surface,
                                    },
                                  ]}
                                >
                                  <View style={styles.exampleCardInner}>
                                    <View style={styles.exampleCardHeader}>
                                      <Text style={[styles.exampleTitle, { color: colors.text }]} numberOfLines={2}>
                                        {menu.title}
                                      </Text>
                                      {typeof menu.timeMinutes === 'number' && (
                                        <Text style={[styles.exampleMeta, { color: colors.mutedForeground }]}>
                                          {menu.timeMinutes}分
                                        </Text>
                                      )}
                                    </View>
                                    <Text style={[styles.exampleText, { color: colors.text }]} numberOfLines={4}>
                                      {menu.summary}
                                    </Text>
                                    {menu.keyIngredients.length > 0 && (
                                      <View style={styles.ingredientsRow}>
                                        {menu.keyIngredients.slice(0, 5).map((ing) => (
                                          <View
                                            key={ing}
                                            style={[
                                              styles.ingredientChip,
                                              {
                                                borderColor: `${colors.primary}4D`,
                                                backgroundColor: `${colors.primary}0D`,
                                              },
                                            ]}
                                          >
                                            <Text style={[styles.ingredientChipText, { color: colors.primary }]}>
                                              {ing}
                                            </Text>
                                          </View>
                                        ))}
                                      </View>
                                    )}
                                    {menu.steps.length > 0 && (
                                      <View style={styles.stepsWrapper}>
                                        {menu.steps.slice(0, 3).map((s, i) => (
                                          <Text key={`${i}-${s}`} style={[styles.stepText, { color: colors.mutedForeground }]}>
                                            {i + 1}. {s}
                                          </Text>
                                        ))}
                                      </View>
                                    )}
                                  </View>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
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
  retryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  exampleWrapper: {
    gap: Spacing.xs,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: Spacing.xs,
  },
  exampleCardWrapper: {
    marginBottom: Spacing.md,
  },
  exampleCardInner: {
    gap: Spacing.xs,
  },
  exampleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exampleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  exampleMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  kojiLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
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
  exampleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  ingredientsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  ingredientChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ingredientChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepsWrapper: {
    gap: 2,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 16,
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
