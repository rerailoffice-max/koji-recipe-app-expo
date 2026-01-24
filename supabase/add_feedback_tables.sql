-- AIフィードバックテーブル（AIメニュー提案へのフィードバック）
CREATE TABLE IF NOT EXISTS public.ai_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message_text TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('like', 'dislike')),
  reasons TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_user_id ON public.ai_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_feedback_type ON public.ai_feedbacks(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_created_at ON public.ai_feedbacks(created_at DESC);

-- コメント
COMMENT ON TABLE public.ai_feedbacks IS 'AIメニュー提案へのフィードバック';
COMMENT ON COLUMN public.ai_feedbacks.message_text IS 'AIが生成したメッセージ（最大1000文字）';
COMMENT ON COLUMN public.ai_feedbacks.feedback_type IS 'like または dislike';
COMMENT ON COLUMN public.ai_feedbacks.reasons IS '選択された理由の配列';
COMMENT ON COLUMN public.ai_feedbacks.comment IS 'ユーザーのコメント（任意）';

-- RLS（Row Level Security）ポリシー
ALTER TABLE public.ai_feedbacks ENABLE ROW LEVEL SECURITY;

-- 誰でも挿入可能（匿名ユーザーも含む）
CREATE POLICY "Anyone can insert ai_feedbacks" ON public.ai_feedbacks
  FOR INSERT WITH CHECK (true);

-- 自分のフィードバックのみ閲覧可能
CREATE POLICY "Users can view own ai_feedbacks" ON public.ai_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- =========================================

-- ご意見ボックステーブル（一般的なフィードバック）
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON public.feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);

-- コメント
COMMENT ON TABLE public.feedbacks IS 'アプリへの一般的なフィードバック';
COMMENT ON COLUMN public.feedbacks.content IS 'ユーザーからの意見・要望';

-- RLS（Row Level Security）ポリシー
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- 誰でも挿入可能（匿名ユーザーも含む）
CREATE POLICY "Anyone can insert feedbacks" ON public.feedbacks
  FOR INSERT WITH CHECK (true);

-- 自分のフィードバックのみ閲覧可能
CREATE POLICY "Users can view own feedbacks" ON public.feedbacks
  FOR SELECT USING (auth.uid() = user_id);
