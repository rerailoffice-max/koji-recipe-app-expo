-- 管理者による投稿削除を許可するポリシー
-- admin@gochisokoji.com のユーザーはすべての投稿を削除可能にする

-- 既存の削除ポリシーを削除
drop policy if exists "posts_delete_own" on public.posts;

-- 新しい削除ポリシー: 自分の投稿 OR 管理者
create policy "posts_delete_own_or_admin"
on public.posts for delete
using (
  auth.uid() = user_id 
  OR 
  auth.jwt() ->> 'email' = 'admin@gochisokoji.com'
);
