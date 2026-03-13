-- Seed a small, opinionated syllabus graph for topics
-- that are frequently used in the Skill Map, using the
-- existing micro_topics + topic_dependencies schema.
--
-- This migration is SAFE to run multiple times:
-- - micro_topics inserts use ON CONFLICT DO NOTHING
-- - topic_dependencies inserts also use ON CONFLICT DO NOTHING
--
-- Assumptions:
-- - micro_topics.id is an integer primary key
-- - micro_topics.topic_name (or name) is UNIQUE
--   Adjust the column name below if your schema differs.

-- PHYSICS CLUSTER: Vectors → System of Particles → Center of Mass → Rotational Motion
-- Adapted to existing micro_topics schema:
-- columns: id, topic_name, subject, target_exam, created_at, resource_url, ncert_reference, difficulty_level

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Physics', 'Vectors (Core)', 'NEET', 2
where not exists (
  select 1 from public.micro_topics where topic_name = 'Vectors (Core)'
);

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Physics', 'System of Particles (Core)', 'NEET', 2
where not exists (
  select 1 from public.micro_topics where topic_name = 'System of Particles (Core)'
);

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Physics', 'Center of Mass (NEET/JEE)', 'NEET', 2
where not exists (
  select 1 from public.micro_topics where topic_name = 'Center of Mass (NEET/JEE)'
);

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Physics', 'Rotational Motion (Rigid Body)', 'NEET', 3
where not exists (
  select 1 from public.micro_topics where topic_name = 'Rotational Motion (Rigid Body)'
);

-- CHEMISTRY CLUSTER: Atomic Structure → Periodic Table → Chemical Bonding

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Chemistry', 'Atomic Structure (Core)', 'NEET', 2
where not exists (
  select 1 from public.micro_topics where topic_name = 'Atomic Structure (Core)'
);

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Chemistry', 'Periodic Table & Periodicity', 'NEET', 2
where not exists (
  select 1 from public.micro_topics where topic_name = 'Periodic Table & Periodicity'
);

insert into public.micro_topics (subject, topic_name, target_exam, difficulty_level)
select 'Chemistry', 'Chemical Bonding & Molecular Structure', 'NEET', 3
where not exists (
  select 1 from public.micro_topics where topic_name = 'Chemical Bonding & Molecular Structure'
);

-- Link dependencies using topic_dependencies.
-- We always resolve ids by topic_name so this works even
-- if ids differ between environments.

-- Physics chain:
--   Vectors (Core) -> System of Particles (Core) -> Center of Mass (NEET/JEE) -> Rotational Motion (Rigid Body)

insert into public.topic_dependencies (topic_id, prerequisite_topic_id)
select t.topic_id, t.prereq_id
from (
  select
    (select id from public.micro_topics where topic_name = 'System of Particles (Core)')      as topic_id,
    (select id from public.micro_topics where topic_name = 'Vectors (Core)')                 as prereq_id
  union all
  select
    (select id from public.micro_topics where topic_name = 'Center of Mass (NEET/JEE)')      as topic_id,
    (select id from public.micro_topics where topic_name = 'System of Particles (Core)')     as prereq_id
  union all
  select
    (select id from public.micro_topics where topic_name = 'Rotational Motion (Rigid Body)') as topic_id,
    (select id from public.micro_topics where topic_name = 'Center of Mass (NEET/JEE)')      as prereq_id
) as t
where t.topic_id is not null
  and t.prereq_id is not null
on conflict (topic_id, prerequisite_topic_id) do nothing;

-- Chemistry chain:
--   Atomic Structure (Core) -> Periodic Table & Periodicity -> Chemical Bonding & Molecular Structure

insert into public.topic_dependencies (topic_id, prerequisite_topic_id)
select t.topic_id, t.prereq_id
from (
  select
    (select id from public.micro_topics where topic_name = 'Periodic Table & Periodicity')          as topic_id,
    (select id from public.micro_topics where topic_name = 'Atomic Structure (Core)')               as prereq_id
  union all
  select
    (select id from public.micro_topics where topic_name = 'Chemical Bonding & Molecular Structure') as topic_id,
    (select id from public.micro_topics where topic_name = 'Periodic Table & Periodicity')           as prereq_id
) as t
where t.topic_id is not null
  and t.prereq_id is not null
on conflict (topic_id, prerequisite_topic_id) do nothing;

