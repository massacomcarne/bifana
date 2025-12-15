-- Enable required extensions
create extension if not exists "pgcrypto";

set search_path = public;

-- Entities represent either groups or users. Users can optionally belong to a group.
create table if not exists entities (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('group', 'user')),
  name text not null,
  avatar_url text,
  group_id uuid references entities (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists timers (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references entities (id) on delete cascade,
  duration_seconds integer not null check (duration_seconds > 0),
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  status text not null default 'paused' check (status in ('paused', 'running', 'finished')),
  running_since timestamptz,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_timers_entity on timers (entity_id);

create table if not exists session_state (
  id integer primary key default 1 check (id = 1),
  active_timer_id uuid references timers (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into session_state (id)
values (1)
on conflict (id) do nothing;

create or replace function trigger_set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_timestamp_entities
before update on entities
for each row
execute procedure trigger_set_timestamp();

create trigger set_timestamp_timers
before update on timers
for each row
execute procedure trigger_set_timestamp();

create trigger set_timestamp_session_state
before update on session_state
for each row
execute procedure trigger_set_timestamp();

-- Resume a timer, pausing any other active timer atomically
create or replace function resume_timer(target_timer uuid)
returns timers
language plpgsql
security definer
set search_path = public as $$
declare
  now_ts timestamptz := now();
  previous_active uuid;
  previous_elapsed integer := 0;
  resumed timers;
begin
  select active_timer_id
    into previous_active
  from session_state
  where id = 1
  for update;

  if previous_active = target_timer then
    update timers
       set running_since = now_ts,
           status = 'running'
     where id = target_timer
     returning * into resumed;

    update session_state set updated_at = now_ts where id = 1;

    return resumed;
  end if;

  if previous_active is not null then
    select coalesce(extract(epoch from now_ts - running_since)::integer, 0)
      into previous_elapsed
    from timers
    where id = previous_active;

    update timers
       set elapsed_seconds = elapsed_seconds + previous_elapsed,
           running_since = null,
           status = case
             when duration_seconds <= elapsed_seconds + previous_elapsed then 'finished'
             else 'paused'
           end
     where id = previous_active;
  end if;

  update session_state
     set active_timer_id = target_timer,
         updated_at = now_ts
   where id = 1;

  update timers
     set running_since = now_ts,
         status = 'running'
   where id = target_timer
   returning * into resumed;

  return resumed;
end;
$$;

-- Pause a timer and clear active state if necessary
create or replace function pause_timer(target_timer uuid)
returns timers
language plpgsql
security definer
set search_path = public as $$
declare
  now_ts timestamptz := now();
  paused timers;
  additional integer := 0;
begin

  select coalesce(extract(epoch from now_ts - running_since)::integer, 0)
    into additional
  from timers
  where id = target_timer;

  update timers
     set elapsed_seconds = elapsed_seconds + additional,
         running_since = null,
         status = case
           when duration_seconds <= elapsed_seconds + additional then 'finished'
           else 'paused'
         end
   where id = target_timer
   returning * into paused;

  update session_state
     set active_timer_id = null,
         updated_at = now_ts
   where id = 1 and active_timer_id = target_timer;

  return paused;
end;
$$;
-- Reset a timer, optionally changing its duration
create or replace function reset_timer(target_timer uuid, new_duration integer default null)
returns timers
language plpgsql
security definer
set search_path = public as $$
declare
  now_ts timestamptz := now();
  reset_row timers;
begin
  update timers
     set duration_seconds = coalesce(new_duration, duration_seconds),
         elapsed_seconds = 0,
         running_since = null,
         status = 'paused'
   where id = target_timer
   returning * into reset_row;

  update session_state
     set active_timer_id = case when active_timer_id = target_timer then null else active_timer_id end,
         updated_at = now_ts
   where id = 1;

  return reset_row;
end;
$$;
