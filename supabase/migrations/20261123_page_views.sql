create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references open_house_pages(id) on delete set null,
  slug text not null,
  page_type text not null default 'open_house',
  viewed_at timestamptz not null default now()
);

create index if not exists page_views_slug_idx on page_views(slug);
create index if not exists page_views_page_id_idx on page_views(page_id);

-- Allow anonymous inserts (tracking beacon), no reads without auth
alter table page_views enable row level security;
create policy "anyone can insert a view" on page_views for insert with check (true);
create policy "owners can read their views" on page_views for select using (
  page_id in (
    select id from open_house_pages where created_by = auth.uid()
  )
);
