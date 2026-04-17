-- ============================================================
-- マイグレーション 030: 撮影チェックリストに飛行機・新幹線予約を追加
-- ============================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS transport_reservation_done boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.transport_reservation_done IS '飛行機・新幹線予約済み';
