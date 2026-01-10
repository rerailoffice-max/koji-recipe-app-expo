-- GOCHISOKOJI: minimum schema for posting/drafts/likes/profile
-- Run this in Supabase SQL Editor (client production project).

-- 1) helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) public.users (profile)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- 3) public.posts (drafts + public posts)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  koji_type text not null,
  difficulty text,
  ingredients jsonb,
  steps jsonb,
  is_public boolean not null default false,
  is_ai_generated boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_posts_set_updated_at on public.posts;
create trigger trg_posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create index if not exists idx_posts_public_created_at on public.posts (is_public, created_at desc);
create index if not exists idx_posts_user_public on public.posts (user_id, is_public);

-- 4) public.likes (saved)
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index if not exists idx_likes_user on public.likes (user_id);
create index if not exists idx_likes_post on public.likes (post_id);

-- 5) RLS
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;

-- users: public read (for author display), write own
drop policy if exists "users_select_public" on public.users;
create policy "users_select_public"
on public.users for select
using (true);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
on public.users for insert
with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- posts: read public OR own, write own
drop policy if exists "posts_select_public_or_own" on public.posts;
create policy "posts_select_public_or_own"
on public.posts for select
using (is_public = true or auth.uid() = user_id);

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
on public.posts for insert
with check (auth.uid() = user_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
on public.posts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own"
on public.posts for delete
using (auth.uid() = user_id);

-- likes: read/write own
drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own"
on public.likes for select
using (auth.uid() = user_id);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
on public.likes for insert
with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
on public.likes for delete
using (auth.uid() = user_id);

