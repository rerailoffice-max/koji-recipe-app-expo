-- posts テーブルに「何人分」(servings) 列を追加
-- 既存レシピは 2人分として扱う

ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS servings integer NOT NULL DEFAULT 2;

COMMENT ON COLUMN public.posts.servings IS '何人分（デフォルト2）';

