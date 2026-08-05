import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 300

const NEO_LOGO  = 'https://mettlehq.com/wp-content/uploads/2023/06/NEO_LOGO_HORIZ_WHITE-1.png'
const EHL_LOGO  = 'https://mettlehq.com/wp-content/uploads/2018/06/EHL-Logo.png'
const DISCLAIMER = 'Equal Housing Lender. Not available in all states. © 2026 NEO Home Loans. All rights reserved.'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export async function POST(request: NextRequest) {
  let videoId = ''
  try {
    const body = await request.json()
    videoId = body.videoId
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    const creatomateKey = process.env.CREATOMATE_API_KEY
    if (!creatomateKey) return NextResponse.json({ error: 'CREATOMATE_API_KEY not set' }, { status: 500 })

    const sb = supabase()
    const { data: video, error: vErr } = await sb
      .from('splice_videos')
      .select('*, splice_video_clips(*, splice_scenes(scene_order))')
      .eq('id', videoId).single()
    if (vErr || !video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

    const { data: profile } = await sb
      .from('profiles')
      .select('full_name, email, title, nmls, phone')
      .eq('id', video.user_id).single()

    const clips: any[] = (video.splice_video_clips ?? []).sort((a: any, b: any) => {
      const sa = a.splice_scenes?.scene_order ?? 0
      const sb2 = b.splice_scenes?.scene_order ?? 0
      return sa !== sb2 ? sa - sb2 : (a.clip_order ?? 0) - (b.clip_order ?? 0)
    })
    if (clips.length === 0) return NextResponse.json({ error: 'No clips found' }, { status: 400 })

    const p = profile as any
    const name  = p?.full_name ?? ''
    const title = p?.title ?? ''
    const nmls  = p?.nmls ? `NMLS# ${p.nmls}` : ''
    const phone = p?.phone ?? ''
    const email = p?.email ?? ''

    // Build video elements — one per clip, stacked sequentially on track 1
    // Creatomate handles WebM natively, no transcode step needed
    const videoElements = clips.map((clip, i) => ({
      id: `clip-${i}`,
      type: 'video',
      track: 1,
      source: clip.clip_url,
      fit: 'cover',
      volume: '100%',
    }))

    // Auto-transcript caption element — Creatomate transcribes and times automatically
    // Linked to all video clips, renders as lower-third ALL CAPS overlay
    const transcriptElement = {
      type: 'transcript',
      track: 2,
      clip_ids: clips.map((_: any, i: number) => `clip-${i}`),
      text_transform: 'uppercase',
      font_family: 'Inter',
      font_weight: '700',
      font_size: '8 vmin',
      fill_color: '#ffffff',
      background_color: 'rgba(0,0,0,0.6)',
      background_x_padding: '30%',
      background_y_padding: '20%',
      background_border_radius: '20%',
      x: '50%',
      y: '82%',
      width: '85%',
      x_alignment: '50%',
      y_alignment: '50%',
      word_count: 2,
    }

    // End card composition — appears after all clips
    const endCardElements: any[] = [
      // Navy background
      {
        type: 'rectangle',
        track: 1,
        fill_color: '#060e1f',
        width: '100%',
        height: '100%',
        x: '50%',
        y: '50%',
      },
      // NEO logo — top
      {
        type: 'image',
        track: 2,
        source: NEO_LOGO,
        width: '60%',
        x: '50%',
        y: '14%',
        x_alignment: '50%',
        y_alignment: '50%',
      },
      // Name
      {
        type: 'text',
        track: 3,
        text: name,
        font_family: 'Inter',
        font_weight: '800',
        font_size: '9 vmin',
        fill_color: '#ffffff',
        x: '50%',
        y: '42%',
        width: '85%',
        x_alignment: '50%',
        y_alignment: '50%',
      },
      // Title
      ...(title ? [{
        type: 'text',
        track: 4,
        text: title,
        font_family: 'Inter',
        font_weight: '600',
        font_size: '5.5 vmin',
        fill_color: '#7eb8f7',
        x: '50%',
        y: '51%',
        width: '85%',
        x_alignment: '50%',
        y_alignment: '50%',
      }] : []),
      // NMLS + contact info
      ...(nmls ? [{
        type: 'text',
        track: 5,
        text: [nmls, phone, email].filter(Boolean).join('\n'),
        font_family: 'Inter',
        font_weight: '400',
        font_size: '4 vmin',
        fill_color: '#a0b4c8',
        line_height: '160%',
        x: '50%',
        y: title ? '63%' : '58%',
        width: '85%',
        x_alignment: '50%',
        y_alignment: '50%',
      }] : []),
      // EHL logo
      {
        type: 'image',
        track: 6,
        source: EHL_LOGO,
        width: '25%',
        x: '50%',
        y: '82%',
        x_alignment: '50%',
        y_alignment: '50%',
      },
      // Disclaimer
      {
        type: 'text',
        track: 7,
        text: DISCLAIMER,
        font_family: 'Inter',
        font_weight: '400',
        font_size: '2.2 vmin',
        fill_color: '#4a6070',
        x: '50%',
        y: '93%',
        width: '90%',
        x_alignment: '50%',
        y_alignment: '50%',
      },
    ]

    const endCard = {
      type: 'composition',
      track: 1,
      duration: 7,
      elements: endCardElements,
    }

    // Full RenderScript — clips + captions + end card
    const renderScript = {
      output_format: 'mp4',
      width: 720,
      height: 1280,
      frame_rate: 30,
      elements: [
        // Composition 1: all the footage + auto-captions
        {
          type: 'composition',
          track: 1,
          elements: [
            ...videoElements,
            transcriptElement,
          ],
        },
        // Composition 2: end card (appended after composition 1)
        endCard,
      ],
    }

    const payload = { source: renderScript }
    console.log('Creatomate payload:', JSON.stringify(payload, null, 2))

    const res = await fetch('https://api.creatomate.com/v2/renders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${creatomateKey}`,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await res.text()
    console.log('Creatomate response:', res.status, responseText)

    if (!res.ok) throw new Error('Creatomate error: ' + responseText)

    const data = JSON.parse(responseText)
    // Creatomate returns an array of render objects
    const render = Array.isArray(data) ? data[0] : data
    const renderId = render?.id

    await sb.from('splice_videos')
      .update({ status: 'rendering', render_job_id: renderId })
      .eq('id', videoId)

    return NextResponse.json({ renderId, videoId, clipCount: clips.length })
  } catch (e: any) {
    console.error('Reels render error:', e)
    if (videoId) await supabase().from('splice_videos').update({ status: 'error' }).eq('id', videoId)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
