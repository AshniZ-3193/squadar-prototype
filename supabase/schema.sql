-- Squadar prototype: database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe for a demo-day prototype only: anyone with the app link can read and
-- write squad data. Feedback can only be read with the results PIN.

create extension if not exists pgcrypto;

-- A squad is one group for one night.
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  host_member_id uuid,
  status text not null default 'lobby' check (status in ('lobby', 'live', 'ended')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

-- A member is one person in a squad. BAC is simulated from the facilitator page.
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  name text not null,
  bac_limit numeric(4,3) not null default 0.08,
  has_band boolean not null default true,
  bac numeric(4,3) not null default 0,
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  location_source text check (location_source in ('gps', 'manual')),
  location_updated_at timestamptz,
  status text not null default 'active' check (status in ('active', 'left')),
  joined_at timestamptz not null default now()
);
create index if not exists members_squad_idx on public.members(squad_id);

-- An alert fires when a member reaches their limit.
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  subject_member_id uuid not null references public.members(id) on delete cascade,
  bac numeric(4,3) not null,
  responder_ids uuid[] not null default '{}',
  going_ids uuid[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by uuid references public.members(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists alerts_squad_idx on public.alerts(squad_id);

-- One row per feedback form. Columns match the in-app questions.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  squad_code text,
  member_name text,
  was_host boolean,
  test_role text,
  q1_track_friends_now text,
  q2_would_use_1to5 int,
  q3_vs_current text,
  q4_vs_current_why text,
  q5_share_location text,
  q6_share_bac text,
  q7_see_friends_meters text,
  q8_wristband text,
  q9_notify_own_limit text,
  q10_like_own_limit_1to5 int,
  q11_limit_based_on text,
  q12_full_screen_alert_who text,
  q13_see_who_is_searching text,
  q14_found_her_update text,
  q15_im_good_option text,
  q16_liked text,
  q17_disliked text,
  q18_features_wanted text,
  q19_other_feedback text,
  q20_follow_up_contact text
);

-- Private settings (never readable from the app directly).
create table if not exists public.settings (
  key text primary key,
  value text not null
);
insert into public.settings (key, value) values ('facilitator_pin', '2468')
  on conflict (key) do nothing;

-- Row level security: open for squads/members/alerts (demo), insert-only for feedback.
alter table public.squads enable row level security;
alter table public.members enable row level security;
alter table public.alerts enable row level security;
alter table public.feedback enable row level security;
alter table public.settings enable row level security;

drop policy if exists "demo all squads" on public.squads;
create policy "demo all squads" on public.squads for all to anon, authenticated using (true) with check (true);
drop policy if exists "demo all members" on public.members;
create policy "demo all members" on public.members for all to anon, authenticated using (true) with check (true);
drop policy if exists "demo all alerts" on public.alerts;
create policy "demo all alerts" on public.alerts for all to anon, authenticated using (true) with check (true);
drop policy if exists "demo insert feedback" on public.feedback;
create policy "demo insert feedback" on public.feedback for insert to anon, authenticated with check (true);

grant select, insert, update, delete on public.squads, public.members, public.alerts to anon, authenticated;
grant insert on public.feedback to anon, authenticated;

-- PIN check for the facilitator and results pages.
create or replace function public.check_pin(pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.settings s where s.key = 'facilitator_pin' and s.value = pin);
$$;

create or replace function public.get_feedback(pin text)
returns setof public.feedback
language sql
security definer
set search_path = public
as $$
  select f.* from public.feedback f
  where public.check_pin(pin)
  order by f.created_at;
$$;

revoke all on function public.check_pin(text) from public;
revoke all on function public.get_feedback(text) from public;
grant execute on function public.check_pin(text) to anon, authenticated;
grant execute on function public.get_feedback(text) to anon, authenticated;

-- Live updates between phones.
do $$
begin
  begin alter publication supabase_realtime add table public.squads; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.alerts; exception when duplicate_object then null; end;
end $$;
