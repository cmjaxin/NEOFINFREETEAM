import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Server-side clip upload — bypasses storage RLS using service role key
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    const path = form.get('path') as string | null
    if (!file || !path) return NextResponse.json({ error: 'file and path required' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const { error } = await sb().storage
      .from('splice-clips')
      .upload(path, buffer, { contentType: 'video/webm', upsert: true })

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('upload-clip error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
