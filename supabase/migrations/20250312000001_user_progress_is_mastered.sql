-- Add is_mastered to user_progress for Precision Rank Predictor.
-- Run in Supabase SQL Editor if needed.

ALTER TABLE user_progress
ADD COLUMN IF NOT EXISTS is_mastered BOOLEAN NOT NULL DEFAULT false;

-- Backfill from status (optional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_progress'
      AND column_name = 'status'
  ) THEN
    UPDATE user_progress SET is_mastered = true WHERE status = 'completed';
  END IF;
END $$;
