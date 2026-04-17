-- ============================================================
-- マイグレーション 011: 案件管理システム用テーブルの作成
-- 目的: クライアント・案件・タスク・フィードバック・通知・カレンダー・YouTube連携に
--       必要な全テーブルを作成する
-- ============================================================

-- ============================================================
-- updated_at 自動更新トリガー関数
-- NOTE: 014_create_project_functions.sql でも定義するが、
--       テーブル作成時に必要なため先にここで定義する
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS 'updated_at カラムを現在時刻で自動更新するトリガー関数';

-- ============================================================
-- 1. clients テーブル
-- クライアント（依頼主）の基本情報を管理する
-- ============================================================
CREATE TABLE public.clients (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text        NOT NULL,                  -- クライアント名（会社名 or 個人名）
  contact_name    text,                                  -- 担当者名
  contact_email   text,                                  -- 担当者メールアドレス
  contact_slack_id text,                                 -- 担当者のSlackユーザーID
  notes           text,                                  -- 備考
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.clients             IS 'クライアント（依頼主）情報';
COMMENT ON COLUMN public.clients.contact_slack_id IS '担当者のSlackユーザーID。通知送信に使用する。';

-- ============================================================
-- 2. projects テーブル
-- 動画制作案件の中心テーブル。クライアント・担当編集者と紐づく。
-- ============================================================
CREATE TABLE public.projects (
  id                   uuid             NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title                text             NOT NULL,          -- 案件タイトル
  client_id            uuid             REFERENCES public.clients(id) ON DELETE SET NULL,
  type                 public.project_type   NOT NULL,     -- 案件種別
  format               public.video_format  NOT NULL,     -- 動画フォーマット
  status               public.project_status NOT NULL DEFAULT 'inquiry', -- 案件ステータス
  shooting_date        date,                               -- 撮影日
  editing_start_date   date,                               -- 編集開始予定日
  fb_deadline          date,                               -- FB期限（初回）
  re_fb_deadline       date,                               -- 再FB期限
  delivery_date        date,                               -- 納品予定日
  youtube_publish_date date,                               -- YouTube公開予定日
  assigned_editor_id   uuid             REFERENCES public.users(id) ON DELETE SET NULL,
  notes                text,                               -- 備考
  created_at           timestamptz      NOT NULL DEFAULT now(),
  updated_at           timestamptz      NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.projects                    IS '動画制作案件';
COMMENT ON COLUMN public.projects.assigned_editor_id IS '担当編集者（usersテーブルのID）';
COMMENT ON COLUMN public.projects.fb_deadline        IS '初回フィードバック期限日';
COMMENT ON COLUMN public.projects.re_fb_deadline     IS '再フィードバック期限日';

-- projects updated_at 自動更新トリガー
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. tasks テーブル
-- 案件ごとのタスク（制作ステップ）を管理する
-- ============================================================
CREATE TABLE public.tasks (
  id          uuid            NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid            NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  step_order  int             NOT NULL,                  -- タスクの順序番号
  title       text            NOT NULL,                  -- タスク名
  status      public.task_status NOT NULL DEFAULT 'pending', -- タスクステータス
  due_date    date,                                      -- 期限日
  assignee_id uuid            REFERENCES public.users(id) ON DELETE SET NULL,
  notes       text,                                      -- 備考
  created_at  timestamptz     NOT NULL DEFAULT now(),
  updated_at  timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.tasks            IS '案件ごとのタスク（制作ステップ）';
COMMENT ON COLUMN public.tasks.step_order IS 'タスクの表示順序（昇順で並べる）';
COMMENT ON COLUMN public.tasks.assignee_id IS '担当者（usersテーブルのID）';

-- tasks updated_at 自動更新トリガー
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. feedback_records テーブル
-- クライアントからのフィードバック受信・返信履歴を記録する
-- ============================================================
CREATE TABLE public.feedback_records (
  id            uuid                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid                NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type          public.feedback_type NOT NULL,           -- フィードバック種別（初回・2回目・3回目）
  received_at   timestamptz         NOT NULL DEFAULT now(), -- FB受信日時
  responded_at  timestamptz,                             -- FB返信日時（未返信の場合はNULL）
  notes         text                                     -- 備考
);

COMMENT ON TABLE  public.feedback_records             IS 'クライアントからのフィードバック受信・返信履歴';
COMMENT ON COLUMN public.feedback_records.responded_at IS 'FB返信日時。NULLの場合は未返信。';

-- ============================================================
-- 5. notification_logs テーブル
-- Slack通知の送信履歴を記録する（主にシステムが書き込む）
-- ============================================================
CREATE TABLE public.notification_logs (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id          uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  type                text        NOT NULL,              -- 通知種別（例: fb_reminder, edit_warning など）
  sent_at             timestamptz NOT NULL DEFAULT now(),
  recipient_slack_id  text,                              -- 送信先のSlackユーザーID
  message             text                               -- 送信したメッセージ本文
);

COMMENT ON TABLE  public.notification_logs                   IS 'Slack通知の送信履歴';
COMMENT ON COLUMN public.notification_logs.type              IS '通知種別識別子（例: fb_reminder, overdue_alert）';
COMMENT ON COLUMN public.notification_logs.recipient_slack_id IS '送信先SlackユーザーID';

-- ============================================================
-- 6. calendar_events テーブル
-- Googleカレンダーと同期したイベント情報を保持する
-- ============================================================
CREATE TABLE public.calendar_events (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_event_id  text        UNIQUE,                  -- GoogleカレンダーのイベントID（重複防止）
  project_id       uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  title            text        NOT NULL,                -- イベントタイトル
  start_datetime   timestamptz NOT NULL,                -- 開始日時
  end_datetime     timestamptz NOT NULL,                -- 終了日時
  synced_at        timestamptz NOT NULL DEFAULT now()   -- 最終同期日時
);

COMMENT ON TABLE  public.calendar_events                  IS 'Googleカレンダーと同期したイベント情報';
COMMENT ON COLUMN public.calendar_events.google_event_id  IS 'GoogleカレンダーのイベントID。UNIQUE制約で二重登録を防ぐ。';

-- ============================================================
-- 7. youtube_accounts テーブル
-- 投稿先のYouTubeチャンネル情報を管理する
-- ============================================================
CREATE TABLE public.youtube_accounts (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name  text NOT NULL,    -- チャンネル名（表示用）
  channel_id    text NOT NULL,    -- YouTubeのチャンネルID（例: UCxxxxxxxxxxxxxxxx）
  contact_name  text,             -- 担当者名
  notes         text              -- 備考
);

COMMENT ON TABLE  public.youtube_accounts           IS '投稿先YouTubeチャンネル情報';
COMMENT ON COLUMN public.youtube_accounts.channel_id IS 'YouTubeチャンネルID（例: UCxxxxxxxxxxxxxxxx）';

-- ============================================================
-- 8. youtube_posts テーブル
-- 案件ごとのYouTube投稿予定・実績を管理する
-- ============================================================
CREATE TABLE public.youtube_posts (
  id                  uuid                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id          uuid                     NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  youtube_account_id  uuid                     NOT NULL REFERENCES public.youtube_accounts(id) ON DELETE RESTRICT,
  scheduled_date      date,                                    -- 投稿予定日
  status              public.youtube_post_status NOT NULL DEFAULT 'scheduled', -- 投稿ステータス
  posted_at           timestamptz,                             -- 実際の投稿日時
  notes               text                                     -- 備考
);

COMMENT ON TABLE  public.youtube_posts            IS '案件ごとのYouTube投稿予定・実績';
COMMENT ON COLUMN public.youtube_posts.posted_at  IS '実際に投稿された日時。NULLの場合は未投稿。';

-- ============================================================
-- 9. app_settings テーブル
-- アプリケーション全体の設定値をキーバリュー形式で管理する
-- ============================================================
CREATE TABLE public.app_settings (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text        NOT NULL UNIQUE,   -- 設定キー（一意）
  value       text        NOT NULL,          -- 設定値（文字列として保持）
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.app_settings       IS 'アプリ全体の設定値（キーバリュー形式）';
COMMENT ON COLUMN public.app_settings.key   IS '設定キー（例: fb_warning_days, edit_warning_days）';
COMMENT ON COLUMN public.app_settings.value IS '設定値（文字列。数値の場合はキャスト変換して使用）';
