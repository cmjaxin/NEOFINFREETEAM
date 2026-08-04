import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Temporary endpoint — delete after use
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== 'finfree-seed-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { key, data } = await req.json()
  if (!['ma_data', 'prev_year_data', 'weekly_data'].includes(key)) {
    return NextResponse.json({ error: 'invalid key' }, { status: 400 })
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('production_state')
    .upsert({ key, data, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, key, count: Array.isArray(data) ? data.length : 1 })
}
