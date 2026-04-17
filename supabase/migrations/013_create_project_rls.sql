-- ============================================================
-- マイグレーション 013: 案件管理システム用 RLS（Row Level Security）の設定
-- 目的: テーブルごとにアクセス制御ポリシーを定義し、データの不正閲覧・操作を防ぐ
--
-- 前提:
--   - 認証済みユーザー: auth.uid() が NULL でないこと（Supabase Auth セッション）
--   - admin 判定: public.users テーブルの role = 'admin' を参照する
--   - service_role: バックエンドのサーバーサイド処理（通知Bot等）が使用する特権ロール
-- ============================================================

-- ============================================================
-- 管理者判定ヘルパー
-- NOTE: インライン subquery を使用する（関数は 014 で定義するため）
-- 管理者かどうかの確認式:
--   EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
-- ============================================================

-- ============================================================
-- clients テーブル
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY "clients_select_authenticated"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT は管理者のみ
CREATE POLICY "clients_insert_admin"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE は管理者のみ
CREATE POLICY "clients_update_admin"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE は管理者のみ
CREATE POLICY "clients_delete_admin"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- projects テーブル
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY "projects_select_authenticated"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT は管理者のみ
CREATE POLICY "projects_insert_admin"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE は管理者 OR 担当編集者本人
CREATE POLICY "projects_update_admin_or_editor"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR assigned_editor_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR assigned_editor_id = auth.uid()
  );

-- DELETE は管理者のみ
CREATE POLICY "projects_delete_admin"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- tasks テーブル
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY "tasks_select_authenticated"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT は管理者のみ
CREATE POLICY "tasks_insert_admin"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE は管理者 OR 担当者本人
CREATE POLICY "tasks_update_admin_or_assignee"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR assignee_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR assignee_id = auth.uid()
  );

-- DELETE は管理者のみ
CREATE POLICY "tasks_delete_admin"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- feedback_records テーブル
-- ============================================================
ALTER TABLE public.feedback_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_records_select_authenticated"
  ON public.feedback_records
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "feedback_records_insert_admin"
  ON public.feedback_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "feedback_records_update_admin"
  ON public.feedback_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "feedback_records_delete_admin"
  ON public.feedback_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- youtube_accounts テーブル
-- ============================================================
ALTER TABLE public.youtube_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_accounts_select_authenticated"
  ON public.youtube_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "youtube_accounts_insert_admin"
  ON public.youtube_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "youtube_accounts_update_admin"
  ON public.youtube_accounts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "youtube_accounts_delete_admin"
  ON public.youtube_accounts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- youtube_posts テーブル
-- ============================================================
ALTER TABLE public.youtube_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youtube_posts_select_authenticated"
  ON public.youtube_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "youtube_posts_insert_admin"
  ON public.youtube_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "youtube_posts_update_admin"
  ON public.youtube_posts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "youtube_posts_delete_admin"
  ON public.youtube_posts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- app_settings テーブル
-- ============================================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings_select_authenticated"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "app_settings_insert_admin"
  ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "app_settings_update_admin"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "app_settings_delete_admin"
  ON public.app_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- notification_logs テーブル
-- 通知ログは service_role（バックエンドBot）のみが書き込み可能。
-- 一般ユーザー・管理者は閲覧のみ。
-- ============================================================
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY "notification_logs_select_authenticated"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT: 一般ユーザーには許可しない（service_role は RLS をバイパスするため別途対応不要）
CREATE POLICY "notification_logs_insert_deny"
  ON public.notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE: 一般ユーザーには許可しない
CREATE POLICY "notification_logs_update_deny"
  ON public.notification_logs
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE: 一般ユーザーには許可しない
CREATE POLICY "notification_logs_delete_deny"
  ON public.notification_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================
-- calendar_events テーブル
-- カレンダー同期は service_role（バックエンド）のみが書き込み可能。
-- ============================================================
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY "calendar_events_select_authenticated"
  ON public.calendar_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT: 一般ユーザーには許可しない
CREATE POLICY "calendar_events_insert_deny"
  ON public.calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE: 一般ユーザーには許可しない
CREATE POLICY "calendar_events_update_deny"
  ON public.calendar_events
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE: 一般ユーザーには許可しない
CREATE POLICY "calendar_events_delete_deny"
  ON public.calendar_events
  FOR DELETE
  TO authenticated
  USING (false);
