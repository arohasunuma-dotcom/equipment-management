ALTER TABLE task_batches
  ADD COLUMN IF NOT EXISTS shooting_type text,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS cameraman_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS editor_member_id uuid REFERENCES staff_members(id) ON DELETE SET NULL;
