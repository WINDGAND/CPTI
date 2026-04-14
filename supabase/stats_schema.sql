-- CPTI stats schema for Supabase
-- Execute this SQL in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  result_code text not null,
  mode text not null,
  fingerprint_hash text not null,
  source text not null default 'web',
  constraint quiz_submissions_result_code_check check (
    result_code in (
      'SROD', 'SROA', 'SRFD', 'SRFA',
      'SPOD', 'SPOA', 'SPFD', 'SPFA',
      'IROD', 'IROA', 'IRFD', 'IRFA',
      'IPOD', 'IPOA', 'IPFD', 'IPFA'
    )
  ),
  constraint quiz_submissions_mode_check check (mode in ('single', 'dual'))
);

create index if not exists idx_quiz_submissions_created_at
  on public.quiz_submissions (created_at desc);

create index if not exists idx_quiz_submissions_fingerprint_created_at
  on public.quiz_submissions (fingerprint_hash, created_at desc);

create index if not exists idx_quiz_submissions_result_code
  on public.quiz_submissions (result_code);

alter table public.quiz_submissions enable row level security;

drop policy if exists quiz_submissions_no_client_access on public.quiz_submissions;
create policy quiz_submissions_no_client_access
  on public.quiz_submissions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create or replace view public.stats_summary_view as
with source as (
  select result_code, created_at
  from public.quiz_submissions
),
base as (
  select
    count(*)::bigint as total_submissions,
    coalesce(max(created_at), timezone('utc', now())) as updated_at,
    coalesce(sum((result_code = 'SROD')::int), 0)::bigint as srod_count,
    coalesce(sum((result_code = 'SROA')::int), 0)::bigint as sroa_count,
    coalesce(sum((result_code = 'SRFD')::int), 0)::bigint as srfd_count,
    coalesce(sum((result_code = 'SRFA')::int), 0)::bigint as srfa_count,
    coalesce(sum((result_code = 'SPOD')::int), 0)::bigint as spod_count,
    coalesce(sum((result_code = 'SPOA')::int), 0)::bigint as spoa_count,
    coalesce(sum((result_code = 'SPFD')::int), 0)::bigint as spfd_count,
    coalesce(sum((result_code = 'SPFA')::int), 0)::bigint as spfa_count,
    coalesce(sum((result_code = 'IROD')::int), 0)::bigint as irod_count,
    coalesce(sum((result_code = 'IROA')::int), 0)::bigint as iroa_count,
    coalesce(sum((result_code = 'IRFD')::int), 0)::bigint as irfd_count,
    coalesce(sum((result_code = 'IRFA')::int), 0)::bigint as irfa_count,
    coalesce(sum((result_code = 'IPOD')::int), 0)::bigint as ipod_count,
    coalesce(sum((result_code = 'IPOA')::int), 0)::bigint as ipoa_count,
    coalesce(sum((result_code = 'IPFD')::int), 0)::bigint as ipfd_count,
    coalesce(sum((result_code = 'IPFA')::int), 0)::bigint as ipfa_count
  from source
)
select * from base;

grant usage on schema public to anon, authenticated;
grant select on public.stats_summary_view to anon, authenticated;
