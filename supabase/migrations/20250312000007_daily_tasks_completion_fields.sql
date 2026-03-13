alter table if exists daily_tasks
add column if not exists completed_at timestamp;

alter table if exists daily_tasks
add column if not exists time_spent int;
