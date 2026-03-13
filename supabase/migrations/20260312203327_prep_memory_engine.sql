-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists "pgcrypto";

------------------------------------------------------------
-- 1. user_topic_progress
--    Tracks a student's progress for each micro topic.
------------------------------------------------------------

create table if not exists user_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id integer not null references micro_topics(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'studying', 'practicing', 'mastered')),
  mastery_score numeric default 0,
  questions_attempted integer default 0,
  accuracy numeric default 0,
  confidence integer default 0,
  last_studied_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- At most one progress row per user/topic
create unique index if not exists idx_user_topic_progress_user_topic
  on user_topic_progress (user_id, topic_id);

-- Helpful extra indexes
create index if not exists idx_user_topic_progress_user
  on user_topic_progress (user_id);

create index if not exists idx_user_topic_progress_topic
  on user_topic_progress (topic_id);


------------------------------------------------------------
-- 2. revision_schedule
--    Spaced revision tracking for each topic per user.
------------------------------------------------------------

create table if not exists revision_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id integer not null references micro_topics(id) on delete cascade,
  revision_stage integer,
  next_revision_date date,
  last_revision_date date,
  created_at timestamp with time zone default now()
);

-- Typically one active revision row per user/topic
create unique index if not exists idx_revision_schedule_user_topic
  on revision_schedule (user_id, topic_id);

-- For fetching due revisions quickly
create index if not exists idx_revision_schedule_user_next_date
  on revision_schedule (user_id, next_revision_date);

create index if not exists idx_revision_schedule_topic
  on revision_schedule (topic_id);


------------------------------------------------------------
-- 3. daily_tasks
--    Concrete daily study/practice/revision tasks.
------------------------------------------------------------

create table if not exists daily_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id integer references micro_topics(id) on delete set null,
  task_type text not null
    check (task_type in ('study', 'practice', 'revision')),
  duration_minutes integer,
  scheduled_date date,
  completed boolean default false,
  created_at timestamp with time zone default now()
);

-- Ensure the completed column exists even if daily_tasks was created earlier
alter table if exists daily_tasks
  add column if not exists completed boolean default false;

-- Indexes for dashboards and schedulers
create index if not exists idx_daily_tasks_user_date
  on daily_tasks (user_id, scheduled_date);

create index if not exists idx_daily_tasks_user_completed
  on daily_tasks (user_id, completed);

create index if not exists idx_daily_tasks_topic
  on daily_tasks (topic_id);
