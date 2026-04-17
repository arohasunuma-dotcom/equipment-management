ALTER TABLE public.youtube_schedules ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
