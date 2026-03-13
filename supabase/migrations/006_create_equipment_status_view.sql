create or replace view public.equipment_with_status as
select
  e.*,
  c.name as category_name,
  case
    when e.is_active = false then 'inactive'
    when exists (
      select 1 from public.rentals r
      where r.equipment_id = e.id
        and r.status not in ('cancelled', 'returned')
        and r.start_date <= current_date
        and r.end_date >= current_date
    ) then 'renting'
    when exists (
      select 1 from public.rentals r
      where r.equipment_id = e.id
        and r.status not in ('cancelled', 'returned')
        and r.end_date < current_date
    ) then 'overdue'
    when exists (
      select 1 from public.rentals r
      where r.equipment_id = e.id
        and r.status not in ('cancelled', 'returned')
        and r.start_date > current_date
    ) then 'reserved'
    else 'available'
  end as current_status
from public.equipment e
left join public.categories c on e.category_id = c.id;
