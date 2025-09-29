-- Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Posts
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists idx_posts_author_created on public.posts(author_id, created_at desc);
create index if not exists idx_posts_created on public.posts(created_at desc);

-- Follows
create table if not exists public.follows (
  id bigserial primary key,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists idx_follows_follower on public.follows(follower_id);
create index if not exists idx_follows_followed on public.follows(followed_id);

-- Likes
create table if not exists public.likes (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);
create index if not exists idx_likes_post on public.likes(post_id);
create index if not exists idx_likes_user on public.likes(user_id);

-- Denormalized counters (materialized via views/RPCs)
-- Get posts with meta (author username, likes count, liked_by_me)
create or replace function public.get_posts_with_meta(
  p_viewer_id uuid,
  p_limit int default 20,
  p_user_id uuid default null
)
returns table (
  id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  content text,
  created_at timestamptz,
  likes_count bigint,
  liked_by_me boolean
)
language sql stable as $$
  select
    p.id,
    p.author_id,
    pr.username as author_username,
    pr.display_name as author_display_name,
    p.content,
    p.created_at,
    coalesce(lc.cnt, 0) as likes_count,
    case when p_viewer_id is null then false
         else exists (select 1 from likes l where l.post_id = p.id and l.user_id = p_viewer_id)
    end as liked_by_me
  from posts p
  join profiles pr on pr.id = p.author_id
  left join lateral (
    select count(*)::bigint as cnt from likes where post_id = p.id
  ) lc on true
  where (p_user_id is null or p.author_id = p_user_id)
  order by p.created_at desc
  limit p_limit
$$;

-- Get single post with meta
create or replace function public.get_post_with_meta(
  p_post_id uuid,
  p_viewer_id uuid
)
returns table (
  id uuid,
  author_id uuid,
  author_username text,
  author_display_name text,
  content text,
  created_at timestamptz,
  likes_count bigint,
  liked_by_me boolean
)
language sql stable as $$
  select * from public.get_posts_with_meta(p_viewer_id, 1, null) where id = p_post_id
$$;

-- Personalized feed with cursor
-- cursor: '<created_at_iso>|<id_uuid>'
create or replace function public.get_feed_with_meta(
  p_viewer_id uuid,
  p_limit int default 10,
  p_cursor text default null
)
returns jsonb
language plpgsql stable as $$
declare
  c_time timestamptz;
  c_id uuid;
  result jsonb;
begin
  if p_cursor is not null then
    c_time := split_part(p_cursor, '|', 1)::timestamptz;
    c_id := split_part(p_cursor, '|', 2)::uuid;
  end if;

  with followed as (
    select followed_id from follows where follower_id = p_viewer_id
  ),
  feed as (
    select p.*
    from posts p
    where p.author_id in (select followed_id from followed) or p.author_id = p_viewer_id
      and (p_cursor is null or (p.created_at, p.id) < (c_time, c_id))
    order by p.created_at desc, p.id desc
    limit p_limit
  )
  select jsonb_build_object(
    'items', to_jsonb((select array_agg(row_to_json(t)) from (
      select
        f.id,
        f.author_id,
        pr.username as author_username,
        pr.display_name as author_display_name,
        f.content,
        f.created_at,
        (select count(*) from likes l where l.post_id = f.id) as likes_count,
        exists (select 1 from likes l2 where l2.post_id = f.id and l2.user_id = p_viewer_id) as liked_by_me
      from feed f
      join profiles pr on pr.id = f.author_id
    ) t)),
    'next_cursor',
      case
        when (select count(*) from feed) = p_limit then
          (select to_char(max(created_at), 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') || '|' || cast(max(id) as text) from feed)
        else null
      end
  ) into result;

  return result;
end
$$;

-- Helper to get posts by user with meta
create or replace function public.get_user_posts_with_meta(
  p_user_id uuid,
  p_viewer_id uuid,
  p_limit int default 20
) returns setof public.get_posts_with_meta
language sql stable as $$
  select * from public.get_posts_with_meta(p_viewer_id, p_limit, p_user_id)
$$;
