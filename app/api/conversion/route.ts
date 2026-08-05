import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as serverClient } from '@/lib/supabase/server'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// GET /api/conversion?month=2026-08
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const sb = admin()

  const [{ data: team }, { data: entries }] = await Promise.all([
    sb.from('profiles').select('id, full_name').eq('status', 'approved').order('full_name'),
    sb.from('conversion_entries').select('*').eq('month', month),
  ])

  const entryMap = Object.fromEntries((entries ?? []).map((e: any) => [e.user_id, e]))

  const rows = (team ?? []).map((t: any) => ({
    user_id: t.id,
    name: t.full_name,
    leads:  entryMap[t.id]?.leads  ?? 0,
    apps:   entryMap[t.id]?.apps   ?? 0,
    funded: entryMap[t.id]?.funded ?? 0,
  }))

  return NextResponse.json({ month, rows })
}

// POST /api/conversion — admin saves apps/funded for a person
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { user_id, month, apps, funded } = await req.json()
  if (!user_id || !month) return NextResponse.json({ error: 'user_id and month required' }, { status: 400 })

  const { error } = await admin().from('conversion_entries').upsert(
    { user_id, month, apps: apps ?? 0, funded: funded ?? 0 },
    { onConflict: 'user_id,month', ignoreDuplicates: false },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
