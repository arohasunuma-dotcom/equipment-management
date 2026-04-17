-- ============================================================
-- マイグレーション 015: 外注者管理テーブルの追加
-- 目的: 撮影・編集外注者の管理と案件ごとの支払い記録
-- ============================================================

-- 外注者種別 ENUM
CREATE TYPE public.outsourcer_type AS ENUM (
  'shooting',  -- 撮影外注
  'editing'    -- 編集外注
);

-- 案件ワークタイプ ENUM
CREATE TYPE public.work_type AS ENUM (
  'shooting_only',         -- 撮影のみ
  'editing_only',          -- 編集のみ
  'shooting_and_editing'   -- 撮影＋編集
);

-- ============================================================
-- 1. outsourcers テーブル
-- ============================================================
CREATE TABLE public.outsourcers (
  id         uuid                    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text                    NOT NULL,
  type       public.outsourcer_type  NOT NULL,
  is_active  boolean                 NOT NULL DEFAULT true,
  notes      text,
  created_at timestamptz             NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.outsourcers      IS '外注者（撮影・編集）情報';
COMMENT ON COLUMN public.outsourcers.type IS '外注種別: shooting=撮影外注, editing=編集外注';

-- ============================================================
-- 2. project_outsourcers テーブル
-- 案件ごとに外注者と支払金額を紐付ける
-- ============================================================
CREATE TABLE public.project_outsourcers (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  outsourcer_id uuid        NOT NULL REFERENCES public.outsourcers(id) ON DELETE RESTRICT,
  amount        integer     NOT NULL DEFAULT 0 CHECK (amount >= 0),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.project_outsourcers        IS '案件ごとの外注者・支払金額';
COMMENT ON COLUMN public.project_outsourcers.amount IS '支払金額（円）';

-- ============================================================
-- 3. projects テーブルに work_type カラム追加
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS work_type public.work_type NOT NULL DEFAULT 'shooting_and_editing';

COMMENT ON COLUMN public.projects.work_type IS '案件ワークタイプ: shooting_only/editing_only/shooting_and_editing';

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX idx_project_outsourcers_project_id   ON public.project_outsourcers(project_id);
CREATE INDEX idx_project_outsourcers_outsourcer_id ON public.project_outsourcers(outsourcer_id);
CREATE INDEX idx_project_outsourcers_created_at   ON public.project_outsourcers(created_at);
CREATE INDEX idx_outsourcers_type                 ON public.outsourcers(type);
CREATE INDEX idx_outsourcers_is_active            ON public.outsourcers(is_active);
CREATE INDEX idx_projects_work_type               ON public.projects(work_type);

-- ============================================================
-- RLS ポリシー
-- ============================================================
ALTER TABLE public.outsourcers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_outsourcers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_outsourcers"
  ON public.outsourcers FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_project_outsourcers"
  ON public.project_outsourcers FOR ALL
  TO service_role USING (true) WITH CHECK (true);
