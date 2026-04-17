-- ============================================================
-- マイグレーション 009: users テーブルへ slack_user_id カラム追加
-- 目的: SlackユーザーIDを保持することで、通知送信先の特定を可能にする
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS slack_user_id text;

COMMENT ON COLUMN public.users.slack_user_id IS 'SlackのユーザーID（例: U012AB3CD）。通知送信に使用する。';
