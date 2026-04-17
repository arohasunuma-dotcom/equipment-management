-- ============================================================
-- マイグレーション 031: youtube_accounts に運用担当メンバーを追加
-- ============================================================

ALTER TABLE public.youtube_accounts
  ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.youtube_accounts.member_id IS '運用担当スタッフ（staff_members への参照）';
