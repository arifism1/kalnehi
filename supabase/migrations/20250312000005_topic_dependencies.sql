create table if not exists topic_dependencies (
  id uuid primary key default gen_random_uuid(),
  topic_id integer,
  prerequisite_topic_id integer,
  created_at timestamp default now()
);

create index if not exists idx_topic_dep_topic
on topic_dependencies(topic_id);

create index if not exists idx_topic_dep_prereq
on topic_dependencies(prerequisite_topic_id);
