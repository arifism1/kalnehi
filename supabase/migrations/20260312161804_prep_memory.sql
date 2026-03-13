create table if not exists prep_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  intent text,
  session_state jsonb,
  updated_at timestamp default now(),
  unique (user_id)
);

