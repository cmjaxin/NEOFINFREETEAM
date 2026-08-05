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

    const apiKey = process.env.SHOTSTACK_API_KEY!
    const baseUrl = (process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/stage/render')
      .replace('/render', '')

    const res = await fetch(`${baseUrl}/render/${video.render_job_id}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) throw new Error('Shotstack poll failed: ' + await res.text())

    const data = await res.json()
    const shotStatus = data.response?.status // queued | fetching | rendering | saving | done | failed
    const fileUrl = data.response?.url

    if (shotStatus === 'done' && fileUrl) {
      await sb.from('splice_videos').update({ status: 'ready', file_url: fileUrl }).eq('id', videoId)
      return NextResponse.json({ status: 'ready', fileUrl })
    }

    if (shotStatus === 'failed') {
      await sb.from('splice_videos').update({ status: 'error' }).eq('id', videoId)
      return NextResponse.json({ status: 'error' })
    }

    return NextResponse.json({ status: 'rendering', shotStatus })
  } catch (e: any) {
    console.error('Render status error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
