-- FinFree Team HQ — Supabase Schema
-- Run this in the Supabase SQL editor

-- App users (1:1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  email text unique not null,
  title text default '',
  role text not null default 'member' check (role in ('member','admin')),
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  onboarding_role text not null default 'MA' check (onboarding_role in ('MA','LSCA','PP')),
  status text not null default 'onboarding' check (status in ('onboarding','active','terminated')),
  title text default '',
  team text default '',
  work_email text default '',
  personal_email text default '',
  phone text default '',
  address text default '',
  dob date,
  work_anniversary date,
  start_date date,
  spouse text default '',
  spouse_anniversary date,
  nmls_number text default '',
  licensed_states text default '',
  assigned_ma text default '',
  equipment text default '',
  notes text default '',
  headshot_url text,
  termination_date date,
  termination_reason text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists employee_children (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees on delete cascade,
  name text not null
);

create table if not exists coaching_notes (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees on delete cascade,
  body text not null,
  author_name text not null,
  created_at timestamptz default now()
);

create table if not exists wins (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees on delete cascade,
  body text not null,
  author_name text not null,
  created_at timestamptz default now()
);

create table if not exists checklist_completions (
  employee_id uuid references employees on delete cascade,
  item_id text not null,
  completed_by text not null,
  completed_at timestamptz default now(),
  primary key (employee_id, item_id)
);

create table if not exists message_templates (
  key text primary key,
  body text not null
);

-- Insert default welcome template
insert into message_templates (key, body) values (
  'welcome',
  E'Hello {name}!\n\nWelcome to the FinFree division at NEO, powered by Better. We''re so glad to have you!\n\nI am the Administrative Assistant for the division and Executive Assistant to the division president, Josh Mettle.\n\nThe first few days are usually filled with SO much info, so I won''t bombard you with too many details. I just wanted to reach out and see if you have everything you need for the moment. I''ll check in with you later, but in the meantime, please reach out for any questions or needs — if I don''t know the answer, I''ll find the right person to ask.\n\nBreathe deep & enjoy your first week!\n\nTalk soon,\n{sender}'
) on conflict (key) do nothing;

-- RLS helper functions
create or replace function is_approved() returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

-- Enable RLS
alter table profiles enable row level security;
alter table employees enable row level security;
alter table employee_children enable row level security;
alter table coaching_notes enable row level security;
alter table wins enable row level security;
alter table checklist_completions enable row level security;
alter table message_templates enable row level security;

-- profiles policies
create policy "users can read approved profiles" on profiles for select using (is_approved() or id = auth.uid());
create policy "users can update own profile" on profiles for update using (id = auth.uid());
create policy "admin can update any profile" on profiles for update using (is_admin());
create policy "admin can delete profile" on profiles for delete using (is_admin());
create policy "users can insert own profile" on profiles for insert with check (id = auth.uid());

-- employees policies
create policy "approved users can select employees" on employees for select using (is_approved());
create policy "approved users can insert employees" on employees for insert with check (is_approved());
create policy "approved users can update employees" on employees for update using (is_approved());
create policy "approved users can delete employees" on employees for delete using (is_approved());

-- employee_children, coaching_notes, wins, checklist_completions
create policy "approved select children" on employee_children for select using (is_approved());
create policy "approved insert children" on employee_children for insert with check (is_approved());
create policy "approved delete children" on employee_children for delete using (is_approved());

create policy "approved select coaching" on coaching_notes for select using (is_approved());
create policy "approved insert coaching" on coaching_notes for insert with check (is_approved());
create policy "approved delete coaching" on coaching_notes for delete using (is_approved());

create policy "approved select wins" on wins for select using (is_approved());
create policy "approved insert wins" on wins for insert with check (is_approved());
create policy "approved delete wins" on wins for delete using (is_approved());

create policy "approved select completions" on checklist_completions for select using (is_approved());
create policy "approved insert completions" on checklist_completions for insert with check (is_approved());
create policy "approved delete completions" on checklist_completions for delete using (is_approved());

create policy "approved select templates" on message_templates for select using (is_approved());
create policy "approved upsert templates" on message_templates for insert with check (is_approved());
create policy "approved update templates" on message_templates for update using (is_approved());

-- Storage bucket for headshots (run separately in Supabase dashboard or via CLI)
-- insert into storage.buckets (id, name, public) values ('headshots', 'headshots', true);
-- create policy "public read headshots" on storage.objects for select using (bucket_id = 'headshots');
-- create policy "approved upload headshots" on storage.objects for insert with check (bucket_id = 'headshots' and is_approved());
-- create policy "approved update headshots" on storage.objects for update using (bucket_id = 'headshots' and is_approved());
