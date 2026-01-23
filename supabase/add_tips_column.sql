-- tipsカラムをpostsテーブルに追加
-- Supabase SQL Editorで実行してください

-- コツ・ポイント
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS tips TEXT;

-- コメント追加
COMMENT ON COLUMN public.posts.tips IS 'コツ・ポイント';
