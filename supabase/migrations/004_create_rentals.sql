create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  equipment_id uuid not null references public.equipment(id),
  start_date date not null,
  end_date date not null,
  purpose text not null,
  status text not null default 'reserved' check (status in ('reserved', 'renting', 'returned', 'cancelled', 'overdue')),
  notes text,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_date >= start_date)
);

-- 重複チェック高速化のインデックス
create index rentals_equipment_dates_idx on public.rentals (equipment_id, start_date, end_date);
create index rentals_user_id_idx on public.rentals (user_id);
create index rentals_status_idx on public.rentals (status);

alter table public.rentals enable row level security;

-- 自分の予約は読める
create policy "rentals_select_own" on public.rentals
  for select using (auth.uid() = user_id);

-- 管理者は全件読める
create policy "rentals_select_admin" on public.rentals
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- 認証済みユーザーが自分の予約を作成
create policy "rentals_insert_authenticated" on public.rentals
  for insert with check (auth.uid() = user_id);

-- 自分の予約を更新（キャンセル・返却）
create policy "rentals_update_own" on public.rentals
  for update using (auth.uid() = user_id);

-- 管理者は全件更新
create policy "rentals_update_admin" on public.rentals
  for update using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
