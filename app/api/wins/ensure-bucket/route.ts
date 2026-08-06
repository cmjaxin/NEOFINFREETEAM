import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: buckets } = await sb.storage.listBuckets()
    const exists = buckets?.some(b => b.name === 'win-images')
    if (!exists) {
      const { error } = await sb.storage.createBucket('win-images', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      })
      if (error) throw error
    }
    return NextResponse.json({ ok: true, created: !exists })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
