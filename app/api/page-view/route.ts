import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const { page_id, slug, page_type } = await req.json()
  if (!slug) return NextResponse.json({ ok: false })

  const sb = admin()
  await sb.from('page_views').insert({
    page_id: page_id ?? null,
    slug,
    page_type: page_type ?? 'open_house',
    viewed_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
