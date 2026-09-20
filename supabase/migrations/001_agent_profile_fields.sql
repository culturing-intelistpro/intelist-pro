-- ============================================================
-- Intelist Pro — Agent Personalization Profile Fields
-- Run this in the Supabase SQL Editor (Table Editor > SQL)
-- ⚠️  Security: profiles table must have RLS enabled with
--      USING (auth.uid() = id) policy before running.
-- ============================================================

-- Add new marketing/personalization fields to the existing profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_photo_url  TEXT,
  ADD COLUMN IF NOT EXISTS copy_tone        TEXT CHECK (copy_tone IN ('professional','warm','luxury','energetic')),
  ADD COLUMN IF NOT EXISTS specialties      TEXT,
  ADD COLUMN IF NOT EXISTS certifications   TEXT,
  ADD COLUMN IF NOT EXISTS tagline          TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url     TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url     TEXT;

-- Confirm RLS is on (should already be enabled, this is a safety check)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure the policy exists (idempotent — recreate if needed)
DROP POLICY IF EXISTS "Users can view and edit their own profile" ON public.profiles;
CREATE POLICY "Users can view and edit their own profile"
  ON public.profiles
  FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Also allow insert for new users (upsert uses INSERT + UPDATE)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

