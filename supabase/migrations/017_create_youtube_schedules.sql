-- ============================================================
-- マイグレーション 017: YouTube投稿スケジュール管理テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.youtube_schedules (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_account_id uuid        NOT NULL REFERENCES public.youtube_accounts(id) ON DELETE CASCADE,
  post_date          date,                          -- 投稿日
  post_confirmed     boolean     NOT NULL DEFAULT false,  -- 投稿確認
  post_reserved      boolean     NOT NULL DEFAULT false,  -- 投稿予約
  property_name      text,                          -- 物件名
  video_length       text        NOT NULL DEFAULT 'short' CHECK (video_length IN ('short','long')),  -- ショート/長尺
  status             text        NOT NULL DEFAULT 'pending',  -- 投稿済み/納品済み/etc
  content_type       text,                          -- Instagram転用/ルームツアー/etc
  progress           int         NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  member_id          uuid        REFERENCES public.staff_members(id) ON DELETE SET NULL,  -- 制作担当
  milestones         jsonb       NOT NULL DEFAULT '{}',  -- マイルストーン日付+完了フラグ
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.youtube_schedules             IS 'YouTube投稿スケジュール管理';
COMMENT ON COLUMN public.youtube_schedules.milestones  IS 'マイルストーン。例: {"shooting":{"date":"2025-12-03","done":true}}';

CREATE TRIGGER trg_youtube_schedules_updated_at
  BEFORE UPDATE ON public.youtube_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_youtube_schedules_account_id ON public.youtube_schedules(youtube_account_id);
CREATE INDEX IF NOT EXISTS idx_youtube_schedules_post_date   ON public.youtube_schedules(post_date);
CREATE INDEX IF NOT EXISTS idx_youtube_schedules_member_id   ON public.youtube_schedules(member_id);

ALTER TABLE public.youtube_schedules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "service_role_youtube_schedules"
    ON public.youtube_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
