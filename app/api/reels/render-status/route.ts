import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    const sb = supabase()
    const { data: video } = await sb
      .from('splice_videos')
      .select('render_job_id, status')
      .eq('id', videoId)
      .single()

    if (!video?.render_job_id) {
      return NextResponse.json({ status: video?.status ?? 'unknown' })
    }

    const creatomateKey = process.env.CREATOMATE_API_KEY!
    const res = await fetch(`https://api.creatomate.com/v1/renders/${video.render_job_id}`, {
      headers: { 'Authorization': `Bearer ${creatomateKey}` },
    })
    if (!res.ok) throw new Error('Creatomate poll failed: ' + await res.text())

    const data = await res.json()
    // Creatomate statuses: planned | waiting | transcribing | rendering | succeeded | failed
    const renderStatus = data.status
    const fileUrl = data.url

    if (renderStatus === 'succeeded' && fileUrl) {
      await sb.from('splice_videos').update({ status: 'ready', file_url: fileUrl }).eq('id', videoId)
      return NextResponse.json({ status: 'ready', fileUrl })
    }

    if (renderStatus === 'failed') {
      await sb.from('splice_videos').update({ status: 'error' }).eq('id', videoId)
      return NextResponse.json({ status: 'error', error: data.error_message })
    }

    return NextResponse.json({ status: 'rendering', renderStatus })
  } catch (e: any) {
    console.error('Render status error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
