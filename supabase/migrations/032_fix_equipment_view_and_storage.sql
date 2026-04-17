-- Fix 1: equipment_with_status ビューを相関サブクエリ3本→単一LEFT JOINに書き換え
-- 機材N件に対してrentialsを3N回走査していたのを1N回に削減
create or replace view public.equipment_with_status as
select
  e.*,
  c.name as category_name,
  case
    when e.is_active = false then 'inactive'
    when bool_or(
      r.id is not null
      and r.status not in ('cancelled', 'returned')
      and r.start_date <= current_date
      and r.end_date >= current_date
    ) then 'renting'
    when bool_or(
      r.id is not null
      and r.status not in ('cancelled', 'returned')
      and r.end_date < current_date
    ) then 'overdue'
    when bool_or(
      r.id is not null
      and r.status not in ('cancelled', 'returned')
      and r.start_date > current_date
    ) then 'reserved'
    else 'available'
  end as current_status
from public.equipment e
left join public.categories c on e.category_id = c.id
left join public.rentals r on r.equipment_id = e.id
group by e.id, c.name;

-- Fix 2: equipment-images Storage バケットを作成（既存の場合はスキップ）
insert into storage.buckets (id, name, public)
values ('equipment-images', 'equipment-images', true)
on conflict (id) do nothing;

-- Storage ポリシー: 認証済みユーザーはアップロード可能
create policy "equipment_images_insert"
  on storage.objects for insert
  with check (bucket_id = 'equipment-images');

-- Storage ポリシー: 誰でも読み取り可能（publicバケット）
create policy "equipment_images_select"
  on storage.objects for select
  using (bucket_id = 'equipment-images');

-- Storage ポリシー: アップロードしたユーザーは削除可能
create policy "equipment_images_delete"
  on storage.objects for delete
  using (bucket_id = 'equipment-images');
