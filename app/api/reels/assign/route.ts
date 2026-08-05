import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Replaces all assignments for a script with the provided user_ids list
export async function POST(request: NextRequest) {
  try {
    const { scriptId, userIds }: { scriptId: string; userIds: string[] } = await request.json()
    if (!scriptId) return NextResponse.json({ error: 'scriptId required' }, { status: 400 })

    const supabase = sb()

    const { error: delErr } = await supabase
      .from('splice_script_assignments')
      .delete()
      .eq('script_id', scriptId)
    if (delErr) throw delErr

    if (userIds.length > 0) {
      const { error: insErr } = await supabase
        .from('splice_script_assignments')
        .insert(userIds.map(user_id => ({ script_id: scriptId, user_id })))
      if (insErr) throw insErr
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('assign error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// Fetch current assignments for a script
export async function GET(request: NextRequest) {
  const scriptId = new URL(request.url).searchParams.get('scriptId')
  if (!scriptId) return NextResponse.json({ error: 'scriptId required' }, { status: 400 })
  const { data, error } = await sb()
    .from('splice_script_assignments')
    .select('user_id')
    .eq('script_id', scriptId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ userIds: (data ?? []).map((r: any) => r.user_id) })
}
