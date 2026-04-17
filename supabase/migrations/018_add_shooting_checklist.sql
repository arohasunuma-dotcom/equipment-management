-- ============================================================
-- マイグレーション 018: 撮影チェックリスト項目追加
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS model_name       text,
  ADD COLUMN IF NOT EXISTS kickoff_done     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calendar_done    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rental_car_done  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hotel_done       boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.model_name      IS '撮影モデル名';
COMMENT ON COLUMN public.projects.kickoff_done    IS 'キックオフMTG済み';
COMMENT ON COLUMN public.projects.calendar_done   IS 'カレンダーへの情報記入済み';
COMMENT ON COLUMN public.projects.rental_car_done IS 'レンタカー予約済み';
COMMENT ON COLUMN public.projects.hotel_done      IS 'ホテル予約済み';
