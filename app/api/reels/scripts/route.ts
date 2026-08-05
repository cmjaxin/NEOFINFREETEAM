import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Update script status (draft <-> live)
export async function POST(request: NextRequest) {
  try {
    const { scriptId, status } = await request.json()
    if (!scriptId || !status) return NextResponse.json({ error: 'scriptId and status required' }, { status: 400 })

    const { error } = await sb()
      .from('splice_scripts')
      .update({ status })
      .eq('id', scriptId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('scripts route error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
