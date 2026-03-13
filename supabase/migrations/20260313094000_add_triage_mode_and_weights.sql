-- Add triage mode flag for deterministic survival scheduling.

alter table if exists profiles
  add column if not exists triage_mode_active boolean not null default false;

-- Add canonical weighting fields to micro_topics for ROE calculations.

alter table if exists micro_topics
  add column if not exists weightage_score numeric default 0,
  add column if not exists est_minutes_mastery integer default 120;

