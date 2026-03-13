-- Profiles: one row per auth user (onboarding data).
-- Run in Supabase SQL Editor if the table doesn't exist.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  state TEXT,
  class TEXT,
  target_exam TEXT NOT NULL DEFAULT 'NEET',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do anything (for server-side insert after signUp)
CREATE POLICY "Service role full access to profiles"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);
