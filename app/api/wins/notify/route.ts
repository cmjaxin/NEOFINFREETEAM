import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

function resend() { return new Resend(process.env.RESEND_API_KEY ?? 'missing') }

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// POST /api/wins/notify
// Body: { tagged_ids: string[], tagged_names: string[], body: string, author_name: string }
export async function POST(req: NextRequest) {
  const { tagged_ids, tagged_names, body, author_name } = await req.json()
  if (!tagged_ids?.length || !body) return NextResponse.json({ ok: true })

  const sb = admin()
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, full_name, email')
    .in('id', tagged_ids)

  const results = []
  for (const prof of profiles ?? []) {
    if (!prof.email) continue

    const othersTagged = tagged_names.filter((n: string) => n !== prof.full_name)
    const alsoTagged   = othersTagged.length > 0
      ? `<p style="margin:0 0 8px;color:#5C6570;font-size:14px;">Also tagged: ${othersTagged.join(', ')}</p>`
      : ''

    const { error } = await resend().emails.send({
      from:    'Team Wins <FINFREEwins@neoentrepreneurhomeloans.com>',
      to:      prof.email,
      subject: `🏆 ${author_name} tagged you in a team win!`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:40px 20px;">
            <tr><td align="center">
              <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#0A2540,#0f3460);border-radius:16px 16px 0 0;padding:32px 36px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:12px;">🏆</div>
                    <h1 style="color:#ffffff;font-size:24px;font-weight:900;margin:0;letter-spacing:-0.02em;">You've been tagged in a Win!</h1>
                    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:8px 0 0;">${author_name} shouted you out on the FinFree Team Hub</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="background:#ffffff;padding:32px 36px;border-left:1px solid #E4E8EC;border-right:1px solid #E4E8EC;">
                    <p style="margin:0 0 16px;font-size:14px;color:#858889;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">The Win</p>
                    <div style="background:#F4F6F8;border-left:4px solid #5BCBF5;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:20px;">
                      <p style="margin:0;font-size:16px;color:#26303B;line-height:1.7;font-weight:500;">${body.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
                    </div>
                    ${alsoTagged}
                    <p style="margin:20px 0 0;font-size:13px;color:#858889;">Posted by <strong style="color:#26303B;">${author_name}</strong> · NEO FinFree Team Hub</p>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td style="background:#ffffff;padding:0 36px 32px;border-left:1px solid #E4E8EC;border-right:1px solid #E4E8EC;text-align:center;">
                    <a href="https://neofinfree.vercel.app" style="display:inline-block;background:#0A2540;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:10px;">
                      View on Team Hub →
                    </a>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#F4F6F8;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;border:1px solid #E4E8EC;border-top:none;">
                    <p style="margin:0;font-size:12px;color:#858889;">NEO FinFree Division · Team HQ</p>
                  </td>
                </tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    results.push({ name: prof.full_name, email: prof.email, error: error?.message ?? null })
  }

  return NextResponse.json({ results })
}
