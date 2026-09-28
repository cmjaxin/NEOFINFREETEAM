import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    // Generate unique token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store token in database
    const { error: insertError } = await supabase
      .from('calculator_auth_tokens')
      .insert({ email: email.toLowerCase(), token, expires_at: expiresAt })

    if (insertError) {
      console.error('Token insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create magic link' }, { status: 500 })
    }

    // In production, send email via Resend or similar
    // For now, return token for testing (remove in production)
    const magicLink = `${new URL(request.url).origin}/calculator/auth?token=${token}`

    // TODO: Send email via Resend with magic link
    // await resend.emails.send({
    //   from: 'calculator@finfree.com',
    //   to: email,
    //   subject: 'Load Your Financial Freedom Plan',
    //   html: `<p>Click <a href="${magicLink}">here</a> to load your plan.</p>`
    // })

    return NextResponse.json({
      success: true,
      message: 'Magic link created',
      magicLink, // Remove in production
    })
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
