create table if not exists public.units (
  id text primary key,
  building text not null,
  floor int not null,
  line text not null,
  area_m2 numeric(6,2) not null,
  orientation text not null,
  page int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.unit_wishes (
  id bigserial primary key,
  session_id uuid not null references public.anonymous_sessions(id) on delete cascade,
  unit_id text not null references public.units(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, unit_id)
);

create index if not exists idx_unit_wishes_unit_id on public.unit_wishes(unit_id);

create or replace view public.unit_popularity as
select
  u.id as unit_id,
  u.building,
  u.floor,
  u.line,
  count(w.id)::int as wish_count
from public.units u
left join public.unit_wishes w on w.unit_id = u.id
group by u.id, u.building, u.floor, u.line;
