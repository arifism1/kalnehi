create table if not exists study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  topic_id integer,
  event_type text check (event_type in ('started', 'completed', 'skipped')),
  duration_minutes int,
  difficulty_rating int,
  created_at timestamp default now()
);

