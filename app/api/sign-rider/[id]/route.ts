import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// PATCH /api/sign-rider/[id] — unassign: reset address to placeholder, clear listing data
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch the current slug to derive the placeholder name
  const { data: page, error: fetchErr } = await admin()
    .from('open_house_pages').select('slug').eq('id', id).single()
  if (fetchErr || !page) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 })

  const numMatch = page.slug.match(/(\d+)$/)
  const riderLabel = numMatch ? `Sign Rider ${numMatch[1]}` : page.slug

  const { error } = await admin().from('open_house_pages').update({
    address: riderLabel,
    city: '', state: 'UT', zip: '',
    photos: [],
    description: '',
    list_price: null,
    beds: null, baths: null, sqft: null,
    callout_text: null,
    tca_url: null, tca_screenshot: null,
    loom_url: null,
  }).eq('id', id)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, label: riderLabel })
}
