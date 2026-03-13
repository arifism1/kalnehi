-- Remove legacy alarm / voice columns now that Kalnehi
-- no longer acts as a wake-up guard or voice confessional.

alter table if exists profiles
  drop column if exists alarm_url;

