-- タグ機能用テーブル
-- Supabase SQL Editorで実行してください

-- 1) タグマスターテーブル
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'ingredient' | 'style' | 'diet' | 'dish_type'
  emoji TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 投稿とタグの中間テーブル
CREATE TABLE IF NOT EXISTS public.post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, tag_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON public.post_tags (post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON public.post_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON public.tags (category);

-- RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- tags: 誰でも読み取り可能
DROP POLICY IF EXISTS "tags_select_public" ON public.tags;
CREATE POLICY "tags_select_public"
ON public.tags FOR SELECT
USING (true);

-- post_tags: 誰でも読み取り可能、投稿者のみ書き込み可能
DROP POLICY IF EXISTS "post_tags_select_public" ON public.post_tags;
CREATE POLICY "post_tags_select_public"
ON public.post_tags FOR SELECT
USING (true);

DROP POLICY IF EXISTS "post_tags_insert_own" ON public.post_tags;
CREATE POLICY "post_tags_insert_own"
ON public.post_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = post_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "post_tags_delete_own" ON public.post_tags;
CREATE POLICY "post_tags_delete_own"
ON public.post_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = post_id AND user_id = auth.uid()
  )
);

-- 3) 初期タグデータ
INSERT INTO public.tags (name, category, emoji, display_order) VALUES
  -- 食材系
  ('魚', 'ingredient', '🐟', 10),
  ('肉', 'ingredient', '🍖', 11),
  ('卵', 'ingredient', '🥚', 12),
  ('野菜', 'ingredient', '🥬', 13),
  -- スタイル系
  ('時短', 'style', '⚡', 20),
  ('作り置き', 'style', '📦', 21),
  ('おつまみ', 'style', '🍺', 22),
  -- ダイエット系
  ('ダイエット', 'diet', '🏃', 30),
  ('低糖質', 'diet', '🥗', 31),
  -- 料理タイプ
  ('主菜', 'dish_type', '🍳', 40),
  ('副菜', 'dish_type', '🥒', 41),
  ('スープ', 'dish_type', '🍲', 42),
  ('サラダ', 'dish_type', '🥗', 43)
ON CONFLICT (name) DO NOTHING;
