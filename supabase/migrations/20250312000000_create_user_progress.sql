-- user_progress: one row per user per topic (status, next_revision_date)
-- Run this in Supabase SQL Editor if the table doesn't exist yet.

CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  next_revision_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, topic_id)
);

-- Optional: RLS (allow service role to bypass; adjust for auth later)
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to user_progress"
  ON user_progress FOR ALL
  USING (true)
  WITH CHECK (true);
