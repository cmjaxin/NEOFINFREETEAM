import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, userId, address } = body

    if (!name || !email || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const params = new URLSearchParams({
      name_1: name,
      email: email,
      phone_cell: phone,
      added_source: address ?? '',
      RETURNTIMEOUT: '10',
      USERID: userId || '10543',
      GROUPID: '1',
      SEQUENCEID: '1',
      WEBFORMID: '5524',
      PROCESSTYPE: 'mortgage',
      UTMDATA: '',
    })

    const res = await fetch('https://www.bntouchmortgage.net/api/webform/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const text = await res.text()
    console.log('BNTouch response:', res.status, text)

    if (!res.ok) {
      return NextResponse.json({ error: `BNTouch error: ${text}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true, status: res.status, response: text })
  } catch (e: any) {
    console.error('BNTouch lead error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
