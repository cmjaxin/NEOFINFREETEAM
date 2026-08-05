import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Creates the splice_videos row and returns the id
export async function POST(request: NextRequest) {
  try {
    const { scriptId, userId } = await request.json()
    if (!scriptId || !userId) return NextResponse.json({ error: 'scriptId and userId required' }, { status: 400 })

    const { data, error } = await sb()
      .from('splice_videos')
      .insert({ script_id: scriptId, user_id: userId, status: 'uploading' })
      .select()
      .single()

    if (error || !data) throw error ?? new Error('Failed to create video')
    return NextResponse.json({ videoId: data.id })
  } catch (e: any) {
    console.error('start-video error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
