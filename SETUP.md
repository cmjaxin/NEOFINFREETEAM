# FinFree Team HQ — Setup Guide

## Stack
- **Next.js 16 (App Router)** + TypeScript
- **Supabase** (Auth + Postgres + Storage)
- **Tailwind CSS** + Montserrat font
- **Vercel** hosting

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon/public key** (Settings → API)

## 2. Configure environment variables

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Run the schema

In the Supabase SQL editor, paste and run **`supabase/schema.sql`** in full.

## 4. Create the headshots storage bucket

In Supabase → Storage → New bucket:
- Name: `headshots`
- Public bucket: ✓

Then add these policies (Storage → Policies → `headshots` bucket):
```sql
-- Public read
create policy "public read headshots" on storage.objects
  for select using (bucket_id = 'headshots');

-- Approved users can upload
create policy "approved upload headshots" on storage.objects
  for insert with check (bucket_id = 'headshots' and is_approved());

create policy "approved update headshots" on storage.objects
  for update using (bucket_id = 'headshots' and is_approved());
```

## 5. Create Colin's admin account

1. Supabase Dashboard → Authentication → Users → **Add user**
   - Email: `colin.jenson@neohomeloans.com`
   - Password: set a secure one
   - Copy the UUID shown

2. In the SQL editor:
```sql
insert into profiles (id, full_name, email, title, role, status)
values (
  '<PASTE_UUID_HERE>',
  'Colin Jenson',
  'colin.jenson@neohomeloans.com',
  'Marketing Manager',
  'admin',
  'approved'
);
```

## 6. Seed the employee roster

Run **`supabase/seed.sql`** in the SQL editor. This imports all 63 employees (46 active + 17 terminated).

## 7. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Colin's credentials.

---

## Deploy to Vercel

1. Push the repo to GitHub
2. Import to [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

---

## How it works

### Auth flow
- Sign up creates a **pending** account — an admin must approve it in Settings
- Only approved accounts can access the app
- Colin Jenson is the initial admin

### Onboarding
- New hires are added via "Add new hire" → starts onboarding with a role-specific checklist
- Check off items to track progress; the last item auto-graduates them to Active
- "Mark onboarding complete" manually graduates them early

### Checklist roles
- **MA** (Mortgage Advisor): Prior to Starting + Start Day + MA Checklist + Tech Programs
- **LS/CA** (Loan Specialist / Credit Analyst): Prior to Starting + Start Day + LS/CA Checklist
- **PP** (Production Partner): Prior to Starting + Start Day + PP Checklist

### Email actions
- "Send email" (GPTs task) and "Send welcome letter" open pre-filled `mailto:` links
- Edit the Welcome Letter template under **Templates** → it saves to the database

### Headshots
- Click the avatar in a profile to upload a headshot
- Stored in Supabase Storage `headshots` bucket, URL saved to `employees.headshot_url`
