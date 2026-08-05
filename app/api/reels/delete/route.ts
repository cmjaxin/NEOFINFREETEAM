import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// DELETE /api/reels/delete  body: { type: 'script', id } | { type: 'video', id }
export async function POST(request: NextRequest) {
  try {
    const { type, id } = await request.json()
    if (!type || !id) return NextResponse.json({ error: 'type and id required' }, { status: 400 })

    const supabase = sb()

    if (type === 'script') {
      // cascade: clips → videos → assignments → scenes → script
      const { data: videos } = await supabase.from('splice_videos').select('id').eq('script_id', id)
      if (videos?.length) {
        const videoIds = videos.map((v: any) => v.id)
        await supabase.from('splice_video_clips').delete().in('video_id', videoIds)
        await supabase.from('splice_videos').delete().in('id', videoIds)
      }
      await supabase.from('splice_script_assignments').delete().eq('script_id', id)
      await supabase.from('splice_scenes').delete().eq('script_id', id)
      const { error } = await supabase.from('splice_scripts').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (type === 'video') {
      await supabase.from('splice_video_clips').delete().eq('video_id', id)
      const { error } = await supabase.from('splice_videos').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e: any) {
    console.error('Delete error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
