create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  serial_number text,
  notes text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.equipment enable row level security;

-- 全認証ユーザーが読める
create policy "equipment_select_authenticated" on public.equipment
  for select using (auth.role() = 'authenticated');

-- 管理者のみ作成・更新・削除
create policy "equipment_write_admin" on public.equipment
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
