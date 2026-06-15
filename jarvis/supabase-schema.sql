-- Run this in Supabase SQL editor

create table if not exists jarvis_files (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  summary text,
  raw_text text,
  created_at timestamptz default now()
);

create table if not exists jarvis_notes (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  topic text default 'general',
  tags text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists jarvis_intel (
  id uuid default gen_random_uuid() primary key,
  results jsonb not null,
  pulled_at timestamptz default now()
);

create table if not exists jarvis_tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists jarvis_memories (
  id uuid default gen_random_uuid() primary key,
  category text default 'general',
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS (restrict to service key only — no anon access)
alter table jarvis_files enable row level security;
alter table jarvis_notes enable row level security;
alter table jarvis_intel enable row level security;
alter table jarvis_tasks enable row level security;
alter table jarvis_memories enable row level security;
