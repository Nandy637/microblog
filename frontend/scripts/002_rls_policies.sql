alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;

-- Profiles: read all, insert own row on signup trigger (optional), update own
drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles
for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id);

-- Posts
drop policy if exists posts_read_all on public.posts;
create policy posts_read_all on public.posts
for select using (true);

drop policy if exists posts_insert_auth on public.posts;
create policy posts_insert_auth on public.posts
for insert with check (auth.uid() = author_id);

drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
for update using (auth.uid() = author_id);

drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
for delete using (auth.uid() = author_id);

-- Follows: insert/delete by the follower
drop policy if exists follows_read_all on public.follows;
create policy follows_read_all on public.follows
for select using (true);

drop policy if exists follows_insert_auth on public.follows;
create policy follows_insert_auth on public.follows
for insert with check (auth.uid() = follower_id);

drop policy if exists follows_delete_auth on public.follows;
create policy follows_delete_auth on public.follows
for delete using (auth.uid() = follower_id);

-- Likes: insert/delete by the liker
drop policy if exists likes_read_all on public.likes;
create policy likes_read_all on public.likes
for select using (true);

drop policy if exists likes_insert_auth on public.likes;
create policy likes_insert_auth on public.likes
for insert with check (auth.uid() = user_id);

drop policy if exists likes_delete_auth on public.likes;
create policy likes_delete_auth on public.likes
for delete using (auth.uid() = user_id);
