-- ============================================================
-- マイグレーション 012: 案件管理システム用インデックスの作成
-- 目的: 頻繁に使われる検索・JOIN条件に対してインデックスを作成し、クエリ性能を向上させる
-- ============================================================

-- ---- projects テーブル ----

-- 案件ステータスでの絞り込み（一覧表示・ダッシュボード集計で多用）
CREATE INDEX idx_projects_status
  ON public.projects(status);

-- クライアントIDによるJOIN・絞り込み
CREATE INDEX idx_projects_client_id
  ON public.projects(client_id);

-- 担当編集者IDによる絞り込み（マイ案件一覧など）
CREATE INDEX idx_projects_assigned_editor_id
  ON public.projects(assigned_editor_id);

-- 撮影日による日付範囲検索（カレンダー表示・期限アラートで使用）
CREATE INDEX idx_projects_shooting_date
  ON public.projects(shooting_date);

-- ---- tasks テーブル ----

-- 案件IDによるタスク一覧取得（案件詳細画面で必ず使用）
CREATE INDEX idx_tasks_project_id
  ON public.tasks(project_id);

-- 担当者IDによるタスク絞り込み（マイタスク一覧）
CREATE INDEX idx_tasks_assignee_id
  ON public.tasks(assignee_id);

-- ---- feedback_records テーブル ----

-- 案件IDによるFBレコード取得（案件詳細画面・FB履歴表示）
CREATE INDEX idx_feedback_records_project_id
  ON public.feedback_records(project_id);

-- ---- youtube_posts テーブル ----

-- YouTubeアカウントIDによる絞り込み（チャンネル別投稿管理）
CREATE INDEX idx_youtube_posts_youtube_account_id
  ON public.youtube_posts(youtube_account_id);
