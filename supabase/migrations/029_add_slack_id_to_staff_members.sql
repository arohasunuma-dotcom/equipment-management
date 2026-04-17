-- ============================================================
-- マイグレーション 029: staff_members に slack_id カラムを追加
-- ============================================================

ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS slack_id text;

COMMENT ON COLUMN public.staff_members.slack_id IS 'SlackユーザーID（例: U0123456789）';
