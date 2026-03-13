-- Harden Kalnehi topic schema: foreign keys + indexes, but avoid breaking existing data.
-- This migration is defensive: it checks for columns/constraints before adding them.

-- Helper: add a foreign key only if constraint name does not exist and columns exist
do $$
begin
  -- topic_metadata.topic_id -> micro_topics.id
  if exists (
    select 1 from information_schema.columns
    where table_name = 'topic_metadata' and column_name = 'topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'topic_metadata_topic_id_fkey'
  ) then
    alter table topic_metadata
      add constraint topic_metadata_topic_id_fkey
      foreign key (topic_id) references micro_topics(id) on delete cascade;
  end if;

  -- topic_graph_rank.topic_id -> micro_topics.id
  if exists (
    select 1 from information_schema.columns
    where table_name = 'topic_graph_rank' and column_name = 'topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'topic_graph_rank_topic_id_fkey'
  ) then
    alter table topic_graph_rank
      add constraint topic_graph_rank_topic_id_fkey
      foreign key (topic_id) references micro_topics(id) on delete cascade;
  end if;

  -- topic_dependencies.(topic_id, prerequisite_topic_id) -> micro_topics.id
  if exists (
    select 1 from information_schema.columns
    where table_name = 'topic_dependencies' and column_name = 'topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'topic_dependencies_topic_id_fkey'
  ) then
    alter table topic_dependencies
      add constraint topic_dependencies_topic_id_fkey
      foreign key (topic_id) references micro_topics(id) on delete cascade;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'topic_dependencies' and column_name = 'prerequisite_topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'topic_dependencies_prerequisite_topic_id_fkey'
  ) then
    alter table topic_dependencies
      add constraint topic_dependencies_prerequisite_topic_id_fkey
      foreign key (prerequisite_topic_id) references micro_topics(id) on delete cascade;
  end if;

  -- student_topic_progress.topic_id -> micro_topics.id
  if exists (
    select 1 from information_schema.columns
    where table_name = 'student_topic_progress' and column_name = 'topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'student_topic_progress_topic_id_fkey'
  ) then
    alter table student_topic_progress
      add constraint student_topic_progress_topic_id_fkey
      foreign key (topic_id) references micro_topics(id) on delete cascade;
  end if;

  -- student_topic_progress.user_id -> auth.users(id) or profiles(id)
  -- We default to profiles(id), since Kalnehi already uses that pattern elsewhere.
  if exists (
    select 1 from information_schema.columns
    where table_name = 'student_topic_progress' and column_name = 'user_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'student_topic_progress_user_id_fkey'
  ) then
    alter table student_topic_progress
      add constraint student_topic_progress_user_id_fkey
      foreign key (user_id) references profiles(id) on delete cascade;
  end if;

  -- repair_paths.topic_id (if present) -> micro_topics.id
  if exists (
    select 1 from information_schema.columns
    where table_name = 'repair_paths' and column_name = 'topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'repair_paths_topic_id_fkey'
  ) then
    alter table repair_paths
      add constraint repair_paths_topic_id_fkey
      foreign key (topic_id) references micro_topics(id) on delete cascade;
  end if;

  -- repair_paths.weak_topic_id (if present) -> micro_topics.id
  if exists (
    select 1 from information_schema.columns
    where table_name = 'repair_paths' and column_name = 'weak_topic_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'repair_paths_weak_topic_id_fkey'
  ) then
    alter table repair_paths
      add constraint repair_paths_weak_topic_id_fkey
      foreign key (weak_topic_id) references micro_topics(id) on delete cascade;
  end if;
end $$;

-- Indexes to keep planner/diagnostic queries fast.

-- Student progress lookups by user/topic
create index if not exists idx_student_topic_progress_user_topic
  on student_topic_progress(user_id, topic_id);

create index if not exists idx_student_topic_progress_topic
  on student_topic_progress(topic_id);

-- Topic metadata and graph rank joins on topic_id
create index if not exists idx_topic_metadata_topic
  on topic_metadata(topic_id);

create index if not exists idx_topic_graph_rank_topic
  on topic_graph_rank(topic_id);

-- Dependencies are already indexed on topic_id / prerequisite_topic_id in earlier migration,
-- but add defensive indexes if someone created the table manually.
create index if not exists idx_topic_dependencies_topic
  on topic_dependencies(topic_id);

create index if not exists idx_topic_dependencies_prereq
  on topic_dependencies(prerequisite_topic_id);

