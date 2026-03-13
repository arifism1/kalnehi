alter table if exists daily_tasks
alter column topic_id type integer using nullif(topic_id::text, '')::integer;

alter table if exists revision_queue
alter column topic_id type integer using nullif(topic_id::text, '')::integer;

alter table if exists study_events
alter column topic_id type integer using nullif(topic_id::text, '')::integer;

alter table if exists topic_dependencies
alter column topic_id type integer using nullif(topic_id::text, '')::integer;

alter table if exists topic_dependencies
alter column prerequisite_topic_id type integer using nullif(prerequisite_topic_id::text, '')::integer;
