-- Manga Loner - Supabase schema
-- Cole este arquivo no SQL Editor do Supabase e execute uma vez.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  login text not null unique,
  avatar_id text not null default 'level-1-luffy',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapter_catalog (
  id uuid primary key default gen_random_uuid(),
  manga_key text not null,
  manga_title text not null,
  author text not null default 'Catalogo',
  cover text not null default '',
  chapter_number integer not null check (chapter_number > 0),
  xp integer not null check (xp > 0),
  pages integer not null check (pages > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manga_key, chapter_number)
);

create table if not exists public.read_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapter_catalog(id) on delete restrict,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, chapter_id)
);

alter table public.profiles enable row level security;
alter table public.chapter_catalog enable row level security;
alter table public.read_chapters enable row level security;

drop policy if exists "profiles are public" on public.profiles;
create policy "profiles are public"
  on public.profiles for select
  using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "chapter catalog is public" on public.chapter_catalog;
create policy "chapter catalog is public"
  on public.chapter_catalog for select
  using (active = true);

drop policy if exists "users read own chapters" on public.read_chapters;
create policy "users read own chapters"
  on public.read_chapters for select
  using (auth.uid() = user_id);

drop policy if exists "users insert own chapters" on public.read_chapters;
create policy "users insert own chapters"
  on public.read_chapters for insert
  with check (auth.uid() = user_id);

insert into public.chapter_catalog
  (manga_key, manga_title, author, cover, chapter_number, xp, pages, active)
values
  ('gachiakuta', 'Gachiakuta', 'Kei Urana', 'assets/covers/gachiakuta.jpg', 1, 71, 71, true),
  ('gachiakuta', 'Gachiakuta', 'Kei Urana', 'assets/covers/gachiakuta.jpg', 2, 42, 42, true),
  ('alien-headbutt', 'Alien Headbutt', 'Akira Inui', 'assets/covers/alien-headbutt.jpg', 1, 50, 50, true),
  ('naruto', 'Naruto', 'Masashi Kishimoto', 'assets/covers/naruto.webp', 1, 54, 54, true),
  ('one-piece', 'One Piece', 'Eiichiro Oda', 'assets/covers/one-piece.jpg', 1, 60, 60, true)
on conflict (manga_key, chapter_number) do update set
  manga_title = excluded.manga_title,
  author = excluded.author,
  cover = excluded.cover,
  xp = excluded.xp,
  pages = excluded.pages,
  active = excluded.active,
  updated_at = now();

create or replace function public.get_ranking()
returns table (
  position bigint,
  id uuid,
  display_name text,
  login text,
  avatar_id text,
  total_xp bigint,
  pages bigint,
  chapters bigint,
  mangas bigint,
  last_read_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by
        coalesce(sum(c.xp), 0) desc,
        count(r.id) desc,
        coalesce(sum(c.pages), 0) desc,
        max(r.read_at) desc nulls last
    ) as position,
    p.id,
    p.display_name,
    p.login,
    p.avatar_id,
    coalesce(sum(c.xp), 0)::bigint as total_xp,
    coalesce(sum(c.pages), 0)::bigint as pages,
    count(r.id)::bigint as chapters,
    count(distinct c.manga_key)::bigint as mangas,
    max(r.read_at) as last_read_at
  from public.profiles p
  left join public.read_chapters r on r.user_id = p.id
  left join public.chapter_catalog c on c.id = r.chapter_id
  group by p.id, p.display_name, p.login, p.avatar_id;
$$;

grant execute on function public.get_ranking() to anon, authenticated;
