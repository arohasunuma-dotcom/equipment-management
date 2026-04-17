-- ============================================================
-- マイグレーション 010: 案件管理システム用 ENUM 型の作成
-- 目的: 案件・タスク・フィードバック・YouTube投稿の状態管理に使うENUM型を定義する
-- ============================================================

-- 案件ステータス
-- inquiry: 問い合わせ段階 / shooting_scheduled: 撮影予定 / shooting_done: 撮影完了
-- editing: 編集中 / fb_waiting: FB待ち / fb_responded: FB返信済み
-- fix_editing: 修正編集中 / re_fb_waiting: 再FB待ち / completed: 完了 / cancelled: キャンセル
CREATE TYPE public.project_status AS ENUM (
  'inquiry',
  'shooting_scheduled',
  'shooting_done',
  'editing',
  'fb_waiting',
  'fb_responded',
  'fix_editing',
  're_fb_waiting',
  'completed',
  'cancelled'
);

-- 案件種別
-- room_tour: ルームツアー動画 / other: その他
CREATE TYPE public.project_type AS ENUM (
  'room_tour',
  'other'
);

-- 動画フォーマット（アスペクト比）
-- landscape: 横向き（16:9） / portrait: 縦向き（9:16） / square: 正方形（1:1）
CREATE TYPE public.video_format AS ENUM (
  'landscape',
  'portrait',
  'square'
);

-- タスクステータス
-- pending: 未着手 / in_progress: 進行中 / done: 完了 / skipped: スキップ
CREATE TYPE public.task_status AS ENUM (
  'pending',
  'in_progress',
  'done',
  'skipped'
);

-- フィードバック種別
-- first: 初回FB / second: 2回目FB / third: 3回目FB
CREATE TYPE public.feedback_type AS ENUM (
  'first',
  'second',
  'third'
);

-- YouTube投稿ステータス
-- scheduled: 投稿予定 / posted: 投稿済み / cancelled: キャンセル
CREATE TYPE public.youtube_post_status AS ENUM (
  'scheduled',
  'posted',
  'cancelled'
);
