create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task_id uuid,
  started_at timestamp,
  ended_at timestamp,
  duration_minutes int,
  created_at timestamp default now()
);

