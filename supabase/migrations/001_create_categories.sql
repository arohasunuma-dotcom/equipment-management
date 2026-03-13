create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_select_authenticated" on public.categories
  for select using (auth.role() = 'authenticated');

-- 初期データ
insert into public.categories (name) values
  ('カメラボディ'),
  ('レンズ'),
  ('三脚'),
  ('照明'),
  ('音声機器'),
  ('その他');
