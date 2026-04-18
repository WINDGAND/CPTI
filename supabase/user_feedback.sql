-- CPTI user_feedback schema
-- Execute this SQL in Supabase SQL Editor (after stats_schema.sql).

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  body text not null,
  page_path text,
  fingerprint_hash text not null,
  constraint user_feedback_body_length check (char_length(body) between 1 and 2000)
);

create index if not exists idx_user_feedback_created_at
  on public.user_feedback (created_at desc);

create index if not exists idx_user_feedback_fingerprint_created_at
  on public.user_feedback (fingerprint_hash, created_at desc);

-- RLS: block all direct client access; only service role (server-side) can write
alter table public.user_feedback enable row level security;

drop policy if exists user_feedback_no_client_access on public.user_feedback;
create policy user_feedback_no_client_access
  on public.user_feedback
  for all
  to anon, authenticated
  using (false)
  with check (false);
