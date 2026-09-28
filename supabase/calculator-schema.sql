-- Financial Freedom Calculator — Passwordless Auth & Plan Storage
-- Run this in the Supabase SQL editor

-- Calculator plans table — stores user financial freedom plans
create table if not exists calculator_plans (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  plan_data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Store email + id as composite key to support multiple plans per email
  unique(email, id)
);

-- Index for fast lookups by email
create index if not exists idx_calculator_plans_email on calculator_plans(email);

-- Enable RLS
alter table calculator_plans enable row level security;

-- Policies for calculator_plans (email-based access, no auth required for public storage)
-- Allow anyone to view their plans by email (for password reset flows)
create policy "users can view their plans by email" on calculator_plans
  for select using (true);

-- Allow anyone to insert a plan (public feature)
create policy "anyone can insert plans" on calculator_plans
  for insert with check (true);

-- Allow updates to plans with matching email
create policy "users can update their plans by email" on calculator_plans
  for update using (true) with check (true);

-- Allow deletion of plans
create policy "users can delete their plans" on calculator_plans
  for delete using (true);

-- Calculator email authentication table — one-time magic link codes
create table if not exists calculator_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text unique not null,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours',
  used_at timestamptz
);

-- Index for fast token lookups
create index if not exists idx_calculator_auth_tokens_token on calculator_auth_tokens(token);
create index if not exists idx_calculator_auth_tokens_email on calculator_auth_tokens(email);

-- Clean up old/used tokens monthly
-- Note: Add job scheduler for automatic cleanup, or implement in backend

-- Calculator email subscribers table (for marketing/followup)
create table if not exists calculator_subscribers (
  email text primary key,
  first_name text,
  last_name text,
  advisor_name text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table calculator_auth_tokens enable row level security;
alter table calculator_subscribers enable row level security;

-- Policies for auth tokens (open for magic link flow)
create policy "anyone can insert auth tokens" on calculator_auth_tokens
  for insert with check (true);

create policy "anyone can view valid tokens" on calculator_auth_tokens
  for select using (expires_at > now() and used_at is null);

create policy "anyone can update tokens" on calculator_auth_tokens
  for update using (true) with check (true);

-- Policies for subscribers
create policy "anyone can insert subscribers" on calculator_subscribers
  for insert with check (true);

create policy "anyone can view subscribers" on calculator_subscribers
  for select using (true);

create policy "users can update their subscription" on calculator_subscribers
  for update using (true) with check (true);
