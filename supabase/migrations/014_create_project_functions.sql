-- ============================================================
-- マイグレーション 014: 案件管理システム用DB関数 & 初期データの作成
-- 目的: 認証ユーザーのロール取得・ID取得ヘルパー関数、
--       および app_settings の初期設定値をINSERTする
-- ============================================================

-- ============================================================
-- 1. set_updated_at() 関数
-- updated_at カラムを現在時刻で自動更新するトリガー関数
-- NOTE: 011_create_project_tables.sql で先行定義済み。
--       ここでは OR REPLACE により最新定義を保証する。
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'updated_at カラムを現在時刻で自動更新するトリガー関数';

-- ============================================================
-- 2. get_my_role() 関数
-- 現在の auth.uid() に対応する users.role を返す。
-- 戻り値: 'user' | 'admin'（該当ユーザーが存在しない場合は NULL）
-- 使用例: SELECT public.get_my_role();
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT role::text
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_my_role() IS '現在の認証ユーザーのロール（user または admin）を返す。未認証の場合は NULL。';

-- ============================================================
-- 3. get_my_user_id() 関数
-- auth.uid() を uuid 型で返す。
-- クライアントサイドから自分のユーザーIDを取得する際に使用。
-- 使用例: SELECT public.get_my_user_id();
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_user_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = public
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_user_id() IS '現在の認証ユーザーの UUID を返す。未認証の場合は NULL。';

-- ============================================================
-- 4. app_settings 初期データ
-- 警告日数などの運用設定値を初期投入する。
-- ON CONFLICT DO NOTHING: 既にキーが存在する場合は上書きしない（べき等性確保）
-- ============================================================

-- FBリマインダー: 期限の何日前に通知するか
INSERT INTO public.app_settings (key, value)
VALUES ('fb_warning_days', '3')
ON CONFLICT (key) DO NOTHING;

-- 編集期限警告: 編集開始予定日の何日前に警告するか
INSERT INTO public.app_settings (key, value)
VALUES ('edit_warning_days', '2')
ON CONFLICT (key) DO NOTHING;

-- 再FBリマインダー: 再FB期限の何日前に通知するか
INSERT INTO public.app_settings (key, value)
VALUES ('re_fb_warning_days', '3')
ON CONFLICT (key) DO NOTHING;
