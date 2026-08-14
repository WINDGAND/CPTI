-- CPTI AI 关系助手配额
-- Execute this SQL in Supabase SQL Editor (after stats_schema.sql).
-- 只记次数，不存对话内容。day 按 Asia/Shanghai 自然日。

create table if not exists public.ai_chat_quota_daily (
  fingerprint_hash text not null,
  day date not null,
  count integer not null default 0,
  burst_window_start timestamptz not null default timezone('utc', now()),
  burst_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (fingerprint_hash, day),
  constraint ai_chat_quota_daily_count_check check (count >= 0),
  constraint ai_chat_quota_daily_burst_check check (burst_count >= 0)
);

create table if not exists public.ai_chat_quota_global (
  day date primary key,
  count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ai_chat_quota_global_count_check check (count >= 0)
);

alter table public.ai_chat_quota_daily enable row level security;
alter table public.ai_chat_quota_global enable row level security;

drop policy if exists ai_chat_quota_daily_no_client_access on public.ai_chat_quota_daily;
create policy ai_chat_quota_daily_no_client_access
  on public.ai_chat_quota_daily
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists ai_chat_quota_global_no_client_access on public.ai_chat_quota_global;
create policy ai_chat_quota_global_no_client_access
  on public.ai_chat_quota_global
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace function public.reserve_ai_chat_quota(
  p_fingerprint text,
  p_burst_limit integer default 20,
  p_burst_window_sec integer default 900,
  p_daily_limit integer default 50,
  p_global_daily_limit integer default 3000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;
  v_day date;
  v_next_midnight timestamptz;
  v_retry_day integer;
  v_retry_burst integer;
  v_global public.ai_chat_quota_global%rowtype;
  v_daily public.ai_chat_quota_daily%rowtype;
  v_burst_count integer;
  v_burst_start timestamptz;
begin
  if p_fingerprint is null or length(trim(p_fingerprint)) = 0 then
    return jsonb_build_object('ok', false, 'code', 'fingerprint-required', 'retry_after_sec', 0);
  end if;

  v_now := timezone('utc', now());
  v_day := timezone('Asia/Shanghai', v_now)::date;
  v_next_midnight := ((v_day + 1)::timestamp at time zone 'Asia/Shanghai');
  v_retry_day := greatest(1, ceil(extract(epoch from (v_next_midnight - v_now)))::integer);

  insert into public.ai_chat_quota_global (day, count, updated_at)
  values (v_day, 0, v_now)
  on conflict (day) do nothing;

  select * into v_global
  from public.ai_chat_quota_global
  where day = v_day
  for update;

  if v_global.count >= p_global_daily_limit then
    return jsonb_build_object(
      'ok', false,
      'code', 'ai-chat-global-limited',
      'retry_after_sec', v_retry_day
    );
  end if;

  insert into public.ai_chat_quota_daily (
    fingerprint_hash, day, count, burst_window_start, burst_count, updated_at
  )
  values (trim(p_fingerprint), v_day, 0, v_now, 0, v_now)
  on conflict (fingerprint_hash, day) do nothing;

  select * into v_daily
  from public.ai_chat_quota_daily
  where fingerprint_hash = trim(p_fingerprint)
    and day = v_day
  for update;

  if v_daily.count >= p_daily_limit then
    return jsonb_build_object(
      'ok', false,
      'code', 'ai-chat-daily-limited',
      'retry_after_sec', v_retry_day
    );
  end if;

  if extract(epoch from (v_now - v_daily.burst_window_start)) >= p_burst_window_sec then
    v_burst_count := 0;
    v_burst_start := v_now;
  else
    v_burst_count := v_daily.burst_count;
    v_burst_start := v_daily.burst_window_start;
  end if;

  if v_burst_count >= p_burst_limit then
    v_retry_burst := greatest(
      1,
      ceil(p_burst_window_sec - extract(epoch from (v_now - v_burst_start)))::integer
    );
    return jsonb_build_object(
      'ok', false,
      'code', 'ai-chat-rate-limited',
      'retry_after_sec', v_retry_burst
    );
  end if;

  update public.ai_chat_quota_global
  set count = count + 1,
      updated_at = v_now
  where day = v_day;

  update public.ai_chat_quota_daily
  set count = count + 1,
      burst_count = v_burst_count + 1,
      burst_window_start = v_burst_start,
      updated_at = v_now
  where fingerprint_hash = trim(p_fingerprint)
    and day = v_day;

  return jsonb_build_object('ok', true, 'code', null, 'retry_after_sec', 0);
end;
$$;

create or replace function public.release_ai_chat_quota(p_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz;
  v_day date;
begin
  if p_fingerprint is null or length(trim(p_fingerprint)) = 0 then
    return jsonb_build_object('ok', true);
  end if;

  v_now := timezone('utc', now());
  v_day := timezone('Asia/Shanghai', v_now)::date;

  update public.ai_chat_quota_global
  set count = greatest(count - 1, 0),
      updated_at = v_now
  where day = v_day;

  update public.ai_chat_quota_daily
  set count = greatest(count - 1, 0),
      burst_count = greatest(burst_count - 1, 0),
      updated_at = v_now
  where fingerprint_hash = trim(p_fingerprint)
    and day = v_day;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reserve_ai_chat_quota(text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.release_ai_chat_quota(text) from public, anon, authenticated;
grant execute on function public.reserve_ai_chat_quota(text, integer, integer, integer, integer) to service_role;
grant execute on function public.release_ai_chat_quota(text) to service_role;
