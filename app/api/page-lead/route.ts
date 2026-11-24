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

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, address, source, page_id, page_type, advisor_user_id, advisor_email, advisor_name } = body

  if (!name || !email) return NextResponse.json({ ok: false, error: 'missing fields' }, { status: 400 })

  const sb = admin()

  // Save lead to Supabase
  await sb.from('page_leads').insert({
    page_id: page_id ?? null,
    page_type: page_type ?? 'open_house',
    advisor_user_id: advisor_user_id ?? null,
    name, email, phone,
    address: address ?? '',
    source: source ?? '',
  })

  // Send email notification to advisor if we have their email
  const toEmail = advisor_email ?? null
  if (toEmail && process.env.RESEND_API_KEY) {
    const r = resend()
    const NEO = '#0A2540'
    const CYAN = '#5BCBF5'
    await r.emails.send({
      from: 'NEO FINFree <FINFREEwins@neoentrepreneurhomeloans.com>',
      to: toEmail,
      subject: `New Lead: ${name} — ${address || source}`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;background:#F4F6F8;padding:32px 20px;">
          <div style="background:${NEO};border-radius:14px 14px 0 0;padding:24px 28px;text-align:center;">
            <img src="https://8blocks.s3.us-west-1.amazonaws.com/neo/images/logo-allwhite.png" alt="NEO Home Loans" style="height:28px;width:auto;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />
            <div style="color:${CYAN};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">New Lead</div>
            <div style="color:#fff;font-size:22px;font-weight:800;line-height:1.2;">${name} just filled out a form</div>
          </div>
          <div style="background:#fff;border-radius:0 0 14px 14px;padding:28px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #F4F6F8;font-size:12px;color:#6B7280;font-weight:600;width:120px;">Name</td><td style="padding:8px 0;border-bottom:1px solid #F4F6F8;font-size:14px;color:${NEO};font-weight:700;">${name}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #F4F6F8;font-size:12px;color:#6B7280;font-weight:600;">Email</td><td style="padding:8px 0;border-bottom:1px solid #F4F6F8;font-size:14px;color:${NEO};"><a href="mailto:${email}" style="color:${CYAN};text-decoration:none;">${email}</a></td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #F4F6F8;font-size:12px;color:#6B7280;font-weight:600;">Phone</td><td style="padding:8px 0;border-bottom:1px solid #F4F6F8;font-size:14px;color:${NEO};"><a href="tel:${phone}" style="color:${CYAN};text-decoration:none;">${phone}</a></td></tr>
              <tr><td style="padding:8px 0;font-size:12px;color:#6B7280;font-weight:600;">Listing</td><td style="padding:8px 0;font-size:14px;color:${NEO};">${address || source}</td></tr>
            </table>
            <div style="margin-top:20px;text-align:center;">
              <a href="https://www.neofinfree.com" style="display:inline-block;background:${NEO};color:#fff;border-radius:9px;padding:12px 28px;font-size:14px;font-weight:700;text-decoration:none;">View in FINFree →</a>
            </div>
          </div>
          <div style="margin-top:16px;font-size:10px;color:#9CA3AF;text-align:center;line-height:1.6;">
            Sent by NEO FINFree · You're receiving this because a lead filled out a form on one of your listing pages.
          </div>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true })
}
