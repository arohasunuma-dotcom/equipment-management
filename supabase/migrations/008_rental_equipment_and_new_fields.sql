-- Add new columns
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS shooting_date date;
ALTER TABLE public.rentals ADD COLUMN IF NOT EXISTS return_location text;

-- Migrate status values
UPDATE public.rentals SET status = 'active' WHERE status IN ('reserved', 'renting');
UPDATE public.rentals SET status = 'completed' WHERE status = 'returned';

-- Drop old constraint and add new one
ALTER TABLE public.rentals DROP CONSTRAINT IF EXISTS rentals_status_check;
ALTER TABLE public.rentals ADD CONSTRAINT rentals_status_check
  CHECK (status IN ('active', 'overdue', 'completed', 'cancelled'));

-- Create rental_equipment junction table
CREATE TABLE IF NOT EXISTS public.rental_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, equipment_id)
);
ALTER TABLE public.rental_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "rental_equipment_all" ON public.rental_equipment FOR ALL USING (true);

-- Migrate existing equipment_id data to junction table
INSERT INTO public.rental_equipment (rental_id, equipment_id)
SELECT id, equipment_id FROM public.rentals WHERE equipment_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update equipment_with_status view to handle new statuses
DROP VIEW IF EXISTS public.equipment_with_status;
CREATE VIEW public.equipment_with_status AS
SELECT
  e.*,
  c.name AS category_name,
  CASE
    WHEN NOT e.is_active THEN 'inactive'
    WHEN EXISTS (
      SELECT 1 FROM public.rental_equipment re
      JOIN public.rentals r ON r.id = re.rental_id
      WHERE re.equipment_id = e.id
        AND r.status = 'overdue'
    ) THEN 'overdue'
    WHEN EXISTS (
      SELECT 1 FROM public.rental_equipment re
      JOIN public.rentals r ON r.id = re.rental_id
      WHERE re.equipment_id = e.id
        AND r.status = 'active'
        AND r.start_date <= CURRENT_DATE
        AND r.end_date >= CURRENT_DATE
    ) THEN 'renting'
    WHEN EXISTS (
      SELECT 1 FROM public.rental_equipment re
      JOIN public.rentals r ON r.id = re.rental_id
      WHERE re.equipment_id = e.id
        AND r.status = 'active'
        AND r.start_date > CURRENT_DATE
    ) THEN 'reserved'
    ELSE 'available'
  END AS current_status
FROM public.equipment e
LEFT JOIN public.categories c ON c.id = e.category_id;
