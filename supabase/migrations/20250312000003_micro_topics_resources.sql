-- Add resource intelligence and difficulty to micro_topics.
-- Run in Supabase SQL Editor if needed.

ALTER TABLE micro_topics
ADD COLUMN IF NOT EXISTS resource_url TEXT,
ADD COLUMN IF NOT EXISTS ncert_reference TEXT,
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER;

COMMENT ON COLUMN micro_topics.resource_url IS 'YouTube or other one-shot video URL';
COMMENT ON COLUMN micro_topics.ncert_reference IS 'NCERT page numbers or reference (e.g. Page 12-15)';
COMMENT ON COLUMN micro_topics.difficulty_level IS '1-5 scale for Burnout Guardian triage';
