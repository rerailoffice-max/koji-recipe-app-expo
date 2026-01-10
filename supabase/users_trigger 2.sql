-- GOCHISOKOJI: auth.users -> public.users 自動作成 + 既存ユーザーのバックフィル
-- Supabase SQL Editor（本番プロジェクト）で実行してください。

-- 1) auth.users 作成時に public.users を作るトリガー
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 2) 既存ユーザーを public.users に補完（すでにある分はスキップ）
insert into public.users (id, email)
select au.id, au.email
from auth.users au
where not exists (
  select 1 from public.users u where u.id = au.id
);

