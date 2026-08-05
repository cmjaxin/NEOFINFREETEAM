import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * POST /api/webhooks/conversion
 * Header: x-api-key: <CONVERSION_WEBHOOK_SECRET>
 * Body: { "date": "2026-08-05", "entries": [{ "name": "Matt Smith", "leads": 3 }] }
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.CONVERSION_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { date: string; entries: { name: string; leads: number }[] }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { date, entries } = body
  if (!date || !Array.isArray(entries) || !entries.length) {
    return NextResponse.json({ error: 'date and entries[] required' }, { status: 400 })
  }

  const month = date.slice(0, 7)
  const sb = admin()
  const results: { name: string; status: string }[] = []

  for (const entry of entries) {
    const name = entry.name.trim()

    const { data: existing } = await sb
      .from('conversion_entries')
      .select('leads, apps, funded')
      .eq('name', name)
      .eq('month', month)
      .maybeSingle()

    const { error } = await sb.from('conversion_entries').upsert(
      {
        name,
        month,
        leads:  (existing?.leads  ?? 0) + (entry.leads ?? 0),
        apps:    existing?.apps   ?? 0,
        funded:  existing?.funded ?? 0,
      },
      { onConflict: 'name,month', ignoreDuplicates: false },
    )

    results.push({ name, status: error ? `error: ${error.message}` : 'ok' })
  }

  return NextResponse.json({ month, results })
}
