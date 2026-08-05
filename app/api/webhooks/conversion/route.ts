import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Maps names from external lead system → canonical production dashboard names
const NAME_ALIASES: Record<string, string> = {
  // Matthew Smith
  'matt smith':       'Matthew Smith',
  // Benjamin Kyle
  'ben kyle':         'Benjamin Kyle',
  'benji kyle':       'Benjamin Kyle',
  // Michael Jones
  'mike jones':       'Michael Jones',
  // Michael Breen
  'scott breen':      'Michael Breen',
  'mike breen':       'Michael Breen',
  // Joshua Mettle
  'josh mettle':      'Joshua Mettle',
  // Gregory Allen
  'greg allen':       'Gregory Allen',
  // Scott DiGregorio
  'scott degregorio': 'Scott DiGregorio',
  // Aaron Thomas
  'aaron thomas':     'Aaron Thomas',
  // Katrinka Condie
  'kat condie':       'Katrinka Condie',
  // David Nelson
  'dave nelson':      'David Nelson',
  // Jason Drobeck
  'jason drobeck':    'Jason Drobeck',
  // Justin Padron
  'justin padron':    'Justin Padron',
  // Drake Bloebaum
  'drake bloebaum':   'Drake Bloebaum',
  // Ross Zimmerman
  'ross zimmerman':   'Ross Zimmerman',
  // Skyler Ford
  'sky ford':         'Skyler Ford',
}

function canonicalName(raw: string): string {
  return NAME_ALIASES[raw.trim().toLowerCase()] ?? raw.trim()
}

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
    const name = canonicalName(entry.name)

    const { error } = await sb.from('conversion_entries').upsert(
      { name, month, leads: entry.leads ?? 0 },
      { onConflict: 'name,month', ignoreDuplicates: false },
    )

    results.push({ name, status: error ? `error: ${error.message}` : 'ok' })
  }

  return NextResponse.json({ month, results })
}
