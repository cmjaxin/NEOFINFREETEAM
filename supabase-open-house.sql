-- Run this in your Supabase SQL editor

create table if not exists open_house_pages (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references profiles(id),
  slug text unique not null,
  status text default 'active',

  -- Property
  address text not null,
  city text default '',
  state text default '',
  zip text default '',
  beds integer,
  baths numeric,
  sqft integer,
  lot_size text default '',
  year_built integer,
  description text default '',
  photos text[] default '{}',

  -- Financials
  list_price numeric not null,
  hoa_monthly numeric default 0,
  annual_taxes numeric default 0,
  annual_insurance numeric default 0,

  -- Loan scenarios
  down_pct numeric default 0.035,
  seller_contribution numeric default 0,

  market_rate numeric default 0.07,
  sa_30yr_rate numeric,
  sa_arm_rate numeric,
  sa_arm_years integer default 5,

  -- Advisor
  advisor_name text default '',
  advisor_title text default '',
  advisor_email text default '',
  advisor_phone text default '',
  advisor_photo text default '',
  advisor_nmls text default '',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table open_house_pages enable row level security;

-- Anyone can read active pages (public landing pages)
create policy "Public read active pages"
  on open_house_pages for select
  using (status = 'active');

-- Auth users can insert
create policy "Auth users can insert"
  on open_house_pages for insert
  with check (auth.uid() = created_by);

-- Owners can update their own pages
create policy "Owners can update their pages"
  on open_house_pages for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Admins can do everything
create policy "Admins can manage all"
  on open_house_pages for all
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Run this to add the ARM adjusted rate column (if table already exists):
alter table open_house_pages add column if not exists sa_arm_adjusted_rate numeric;

-- Partner / realtor columns:
alter table open_house_pages add column if not exists partner_name text default '';
alter table open_house_pages add column if not exists partner_title text default '';
alter table open_house_pages add column if not exists partner_email text default '';
alter table open_house_pages add column if not exists partner_phone text default '';
alter table open_house_pages add column if not exists partner_photo text default '';
alter table open_house_pages add column if not exists partner_nmls text default '';
