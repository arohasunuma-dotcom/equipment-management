-- ============================================================
-- マイグレーション 016: 撮影種別・担当者カラムの追加
-- ============================================================

-- 撮影種別 ENUM
DO $$ BEGIN
  CREATE TYPE public.shooting_type AS ENUM ('smartphone', 'dslr');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_type に interview / texture を追加
ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'interview';
ALTER TYPE public.project_type ADD VALUE IF NOT EXISTS 'texture';

-- projects テーブルにカラム追加
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS shooting_type public.shooting_type,
  ADD COLUMN IF NOT EXISTS cameraman_id  uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS editor_member_id uuid REFERENCES public.staff_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_date_input date;

-- delivery_date は既存カラム。delivery_date_input は不要のため追加しない
-- 代わりに既存の delivery_date を直接利用する
ALTER TABLE public.projects DROP COLUMN IF EXISTS delivery_date_input;

COMMENT ON COLUMN public.projects.shooting_type    IS '撮影種別: smartphone=スマホ撮影, dslr=一眼撮影';
COMMENT ON COLUMN public.projects.cameraman_id     IS 'カメラマン（staff_membersテーブルのID）';
COMMENT ON COLUMN public.projects.editor_member_id IS '編集者（staff_membersテーブルのID）';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_projects_cameraman_id     ON public.projects(cameraman_id);
CREATE INDEX IF NOT EXISTS idx_projects_editor_member_id ON public.projects(editor_member_id);
