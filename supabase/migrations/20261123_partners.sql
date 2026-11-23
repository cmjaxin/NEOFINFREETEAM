-- Partners table: real estate agents/teams that advisors work with
create table if not exists partners (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references auth.users(id) on delete set null,
  name        text not null,
  title       text,
  brokerage   text,
  email       text,
  phone       text,
  nmls        text,
  photo_url   text,
  logo_url    text,
  slug        text not null unique,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table open_house_pages
  add column if not exists partner_id uuid references partners(id) on delete set null;

do $$ begin
  if exists (select 1 from information_schema.tables where table_name = 'sign_rider_pages') then
    alter table sign_rider_pages
      add column if not exists partner_id uuid references partners(id) on delete set null;
  end if;
end $$;

alter table partners enable row level security;

create policy "Partners readable by authenticated"
  on partners for select to authenticated using (true);

create policy "Partners insertable by authenticated"
  on partners for insert to authenticated with check (auth.uid() = created_by);

create policy "Partners updatable by creator"
  on partners for update to authenticated using (auth.uid() = created_by);

create policy "Partners deletable by creator"
  on partners for delete to authenticated using (auth.uid() = created_by);
