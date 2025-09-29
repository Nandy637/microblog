-- Add tsvector column with trigger
alter table public.posts
  add column if not exists content_tsv tsvector;

create or replace function public.posts_tsvector_trigger() returns trigger as $$
begin
  new.content_tsv :=
    setweight(to_tsvector('english', coalesce(new.content,'')), 'A');
  return new;
end
$$ language plpgsql;

drop trigger if exists tsvectorupdate on public.posts;
create trigger tsvectorupdate before insert or update
on public.posts for each row execute procedure public.posts_tsvector_trigger();

create index if not exists idx_posts_content_tsv on public.posts using gin (content_tsv);
