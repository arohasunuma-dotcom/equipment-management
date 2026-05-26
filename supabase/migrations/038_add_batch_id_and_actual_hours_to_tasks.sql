-- マイグレーション 038: tasks テーブルに batch_id と actual_hours を追加
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.task_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actual_hours numeric;

-- batch_id でのフィルタを高速化するインデックス
CREATE INDEX IF NOT EXISTS tasks_batch_id_idx ON public.tasks(batch_id);
