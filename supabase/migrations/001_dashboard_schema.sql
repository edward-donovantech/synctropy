-- user_preferences: one row per user, written by dashboard
drop table if exists user_preferences;

create table user_preferences (
  id                  uuid        primary key references auth.users on delete cascade,
  root_path           text,
  ignore_paths        text[]      not null default '{}',
  archive_after_days  int         not null default 365,
  taxonomy_domains    text[]      not null default '{projects,finance,admin,media,reference}',
  updated_at          timestamptz not null default now()
);

alter table user_preferences enable row level security;

create policy "Users manage own preferences"
  on user_preferences for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- entropy_scans: append-only, written by MCP server via service-role key
drop table if exists entropy_scans;

create table entropy_scans (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users on delete cascade,
  scanned_at     timestamptz not null default now(),
  overall_score  float       not null,
  folder_scores  jsonb       not null
  -- folder_scores shape: [{ "path": string, "score": number, "file_count": number }]
);

alter table entropy_scans enable row level security;

create policy "Users read own scans"
  on entropy_scans for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS — no insert policy needed on the dashboard side.

create index entropy_scans_user_scanned_at
  on entropy_scans (user_id, scanned_at desc);
