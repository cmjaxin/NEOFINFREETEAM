import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Check if bucket exists
    const { data: buckets } = await sb.storage.listBuckets()
    const exists = buckets?.some(b => b.name === 'splice-clips')

    if (!exists) {
      const { error } = await sb.storage.createBucket('splice-clips', {
        public: true,
        fileSizeLimit: 524288000, // 500MB
        allowedMimeTypes: ['video/webm', 'video/mp4', 'video/quicktime'],
      })
      if (error) throw error
    }

    return NextResponse.json({ ok: true, created: !exists })
  } catch (e: any) {
    console.error('ensure-bucket error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
