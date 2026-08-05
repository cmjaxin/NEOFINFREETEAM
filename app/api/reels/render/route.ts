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

    const { data: video, error: vErr } = await sb
      .from('splice_videos')
      .select('*, splice_video_clips(*, splice_scenes(scene_order))')
      .eq('id', videoId)
      .single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const { data: profile } = await sb
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', video.user_id)
      .single()

    const shotStackApiKey = process.env.SHOTSTACK_API_KEY
    const shotStackUrl = process.env.SHOTSTACK_API_URL ?? 'https://api.shotstack.io/stage/render'

    if (!shotStackApiKey) {
      return NextResponse.json({ error: 'SHOTSTACK_API_KEY not configured' }, { status: 500 })
    }

    // Sort clips: by scene_order first, then by clip_order within each scene
    const clips: any[] = (video.splice_video_clips ?? []).sort((a: any, b: any) => {
      const sceneA = a.splice_scenes?.scene_order ?? 0
      const sceneB = b.splice_scenes?.scene_order ?? 0
      if (sceneA !== sceneB) return sceneA - sceneB
      return (a.clip_order ?? 0) - (b.clip_order ?? 0)
    })

    if (clips.length === 0) {
      return NextResponse.json({ error: 'No clips found for this video' }, { status: 400 })
    }

    // Build sequential timeline — each clip starts after the previous one ends
    let cursor = 0
    const videoClips = clips.map((clip: any) => {
      const duration = clip.duration_seconds ?? 5
      const item = {
        asset: { type: 'video', src: clip.clip_url, trim: 0 },
        start: cursor,
        length: duration,
        transition: { in: 'fade', out: 'fade' },
      }
      cursor += duration
      return item
    })

    const totalDuration = cursor

    // End card overlay (5 seconds after all clips)
    const endCardDuration = 5
    const endCardStart = totalDuration
    const displayName = (profile as any)?.full_name ?? ''
    const displayEmail = (profile as any)?.email ?? ''

    const timeline = {
      background: { color: '#000000' },
      tracks: [
        // Video track
        { clips: videoClips },
        // End card text track
        {
          clips: [
            {
              asset: {
                type: 'html',
                html: `<p style="font-family:Montserrat,sans-serif;font-size:48px;font-weight:900;color:#ffffff;text-align:center;margin:0">${displayName}</p>`,
                width: 1080,
                height: 200,
              },
              start: endCardStart,
              length: endCardDuration,
              position: 'center',
              offset: { x: 0, y: 0.1 },
              transition: { in: 'fade' },
            },
            {
              asset: {
                type: 'html',
                html: `<p style="font-family:Montserrat,sans-serif;font-size:28px;color:#999999;text-align:center;margin:0">${displayEmail}</p>`,
                width: 1080,
                height: 120,
              },
              start: endCardStart,
              length: endCardDuration,
              position: 'center',
              offset: { x: 0, y: -0.05 },
              transition: { in: 'fade' },
            },
          ],
        },
        // End card background
        {
          clips: [
            {
              asset: { type: 'html', html: '<div style="width:1080px;height:1920px;background:#000a15"></div>', width: 1080, height: 1920 },
              start: endCardStart,
              length: endCardDuration,
            },
          ],
        },
      ],
    }

    const shotRes = await fetch(shotStackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': shotStackApiKey },
      body: JSON.stringify({
        timeline,
        output: { format: 'mp4', resolution: 'hd', aspectRatio: '9:16' },
      }),
    })

    if (!shotRes.ok) {
      const errText = await shotRes.text()
      throw new Error('Shotstack error: ' + errText)
    }

    const shotData = await shotRes.json()
    const renderId = shotData.response?.id

    await sb.from('splice_videos').update({ status: 'rendering', render_job_id: renderId }).eq('id', videoId)

    return NextResponse.json({ renderId, videoId, clipCount: clips.length, totalDuration })
  } catch (e: any) {
    console.error('Reels render error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
