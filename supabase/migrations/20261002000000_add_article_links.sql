-- Article links + images for each disruption signal.
-- Run once in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

ALTER TABLE disruptions ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE disruptions ADD COLUMN IF NOT EXISTS image_url TEXT;
