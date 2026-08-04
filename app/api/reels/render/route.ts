import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    const sb = supabase()

    const { data: video, error: vErr } = await sb
      .from('splice_videos')
      .select('*, splice_video_clips(*, splice_scenes(*))')
      .eq('id', videoId)
      .single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const { data: profile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', video.user_id)
      .single()

    const shotStackApiKey = process.env.SHOTSTACK_API_KEY
    const shotStackUrl = process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/stage/render'

    if (!shotStackApiKey) {
      return NextResponse.json({ error: 'SHOTSTACK_API_KEY not configured' }, { status: 500 })
    }

    const clips = (video.splice_video_clips ?? []).sort(
      (a: any, b: any) => (a.splice_scenes?.scene_order ?? 0) - (b.splice_scenes?.scene_order ?? 0)
    )

    const timeline = {
      background: { color: '#000000' },
      tracks: [
        {
          clips: clips.map((clip: any) => ({
            asset: { type: 'video', src: clip.clip_url },
            start: 0,
            length: clip.duration_seconds ?? 5,
          })),
        },
      ],
    }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', resolution: 'hd' },
      }),
    })

    if (!shotRes.ok) throw new Error('Shotstack error: ' + await shotRes.text())

    const shotData = await shotRes.json()
    const renderId = shotData.response?.id

    await sb.from('splice_videos').update({ status: 'rendering', render_job_id: renderId }).eq('id', videoId)

    return NextResponse.json({ renderId, videoId })
  } catch (e: any) {
    console.error('Reels render error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
