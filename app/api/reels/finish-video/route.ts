import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface ClipRecord {
  sceneId: string | null
  clipUrl: string
  durationSeconds: number
  clipOrder: number
}

// Saves clip records and marks the video as awaiting_scenes
export async function POST(request: NextRequest) {
  try {
    const { videoId, clips }: { videoId: string; clips: ClipRecord[] } = await request.json()
    if (!videoId || !clips?.length) return NextResponse.json({ error: 'videoId and clips required' }, { status: 400 })

    const supabase = sb()

    const rows = clips.map(c => ({
      video_id: videoId,
      scene_id: c.sceneId ?? null,
      clip_url: c.clipUrl,
      duration_seconds: c.durationSeconds,
      clip_order: c.clipOrder,
    }))

    const { error: clipErr } = await supabase.from('splice_video_clips').insert(rows)
    if (clipErr) throw clipErr

    const { error: vidErr } = await supabase
      .from('splice_videos')
      .update({ status: 'awaiting_scenes' })
      .eq('id', videoId)
    if (vidErr) throw vidErr

    // Auto-trigger render — fire and forget (render route is long-running, don't await)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    fetch(`${baseUrl}/api/reels/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId }),
    }).catch(e => console.error('auto-render trigger failed:', e))

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('finish-video error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
