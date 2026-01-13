-- 栄養情報・タグカラムをpostsテーブルに追加
-- Supabase SQL Editorで実行してください

-- 塩分 (グラム)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS salt_g DECIMAL(5,2);

-- カロリー (kcal)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS calories INTEGER;

-- 調理時間 (分)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS cooking_time_min INTEGER;

-- タグ (JSON配列)
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- コメント追加
COMMENT ON COLUMN public.posts.salt_g IS '塩分量（グラム）';
COMMENT ON COLUMN public.posts.calories IS 'カロリー（kcal）';
COMMENT ON COLUMN public.posts.cooking_time_min IS '調理時間（分）';
COMMENT ON COLUMN public.posts.tags IS 'タグ配列（例: ["魚", "時短", "主菜"]）';
