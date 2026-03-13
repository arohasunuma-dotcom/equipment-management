create table public.return_records (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rentals(id),
  returned_at timestamptz not null default now(),
  notes text
);

alter table public.return_records enable row level security;

create policy "return_records_select_own" on public.return_records
  for select using (
    exists (
      select 1 from public.rentals
      where id = rental_id and user_id = auth.uid()
    )
  );

create policy "return_records_select_admin" on public.return_records
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

create policy "return_records_insert" on public.return_records
  for insert with check (
    exists (
      select 1 from public.rentals
      where id = rental_id and user_id = auth.uid()
    )
    or
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
