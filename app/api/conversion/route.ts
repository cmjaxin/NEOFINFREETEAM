import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as serverClient } from '@/lib/supabase/server'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// GET /api/conversion?year=2026&names=Matt Smith,Ben Kyle
export async function GET(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const year = req.nextUrl.searchParams.get('year') ?? new Date().getFullYear().toString()
  const namesParam = req.nextUrl.searchParams.get('names') ?? ''
  const names = namesParam ? namesParam.split(',').map(n => n.trim()).filter(Boolean) : []

  const sb = admin()
  let query = sb.from('conversion_entries').select('name,leads').like('month', `${year}-%`)
  if (names.length) query = query.in('name', names)
  const { data: entries } = await query

  // Sum all monthly lead entries per name
  const leadMap: Record<string, number> = {}
  for (const e of entries ?? []) {
    leadMap[e.name] = (leadMap[e.name] ?? 0) + (e.leads ?? 0)
  }

  const rows = names.map(name => ({ name, leads: leadMap[name] ?? 0 }))

  return NextResponse.json({ year, rows })
}

// POST /api/conversion — admin saves apps/funded for a person
// Body: { name, month, apps, funded }
export async function POST(req: NextRequest) {
  const supabase = await serverClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, month, apps, funded } = await req.json()
  if (!name || !month) return NextResponse.json({ error: 'name and month required' }, { status: 400 })

  const { error } = await admin().from('conversion_entries').upsert(
    { name, month, apps: apps ?? 0, funded: funded ?? 0 },
    { onConflict: 'name,month', ignoreDuplicates: false },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
