import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
    }

    // Fetch via Jina.ai for clean markdown rendering of JS-heavy pages
    let pageText = ''
    try {
      const jinaUrl = `https://r.jina.ai/${url}`
      const jinaRes = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown',
        },
        signal: AbortSignal.timeout(30000),
      })
      if (!jinaRes.ok) {
        return NextResponse.json(
          { error: `Jina fetch failed: ${jinaRes.status} ${jinaRes.statusText}` },
          { status: 422 }
        )
      }
      const text = await jinaRes.text()
      pageText = text.length > 60_000 ? text.slice(0, 60_000) : text
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Failed to fetch TCA page: ${msg}` }, { status: 422 })
    }

    if (!pageText.trim()) {
      return NextResponse.json({ error: 'TCA page returned empty content' }, { status: 422 })
    }

    const prompt = `You are extracting loan scenario data from a Mortgage Coach TCA (Total Cost Analysis) report. Return ONLY valid JSON with no markdown, no commentary.

The TCA page has a table where each column is one loan scenario (e.g. "Market Rate", "1 Year Lender Subsidy", "2 Year Lender Subsidy"). Rows contain:
- Purchase Price
- Down Payment
- Loan Amount
- Interest Rate
- APR
- Term (mos)
- Payment (monthly P&I or PITI)
- Monthly Savings (vs market rate column)
- Savings(60 mos) or similar cumulative savings field

Return this exact JSON shape:

{
  "scenarios": [
    {
      "label": "Market Rate",
      "list_price": 325000,
      "down_pct": 5,
      "market_rate": 7.625,
      "buydown_rate": 7.625,
      "market_payment": 2728.55,
      "buydown_payment": 2728.55,
      "apr": 7.892,
      "total_subsidy": 0
    }
  ],
  "advisor_name": "Skyler Ford",
  "quote_date": "11/19/2026"
}

Rules:
- Each column in the TCA table = one scenario object in the array
- The first column (usually "Market Rate") has market_rate = buydown_rate (no buydown active), and total_subsidy = 0
- For all other columns: buydown_rate = that column's interest rate; market_rate = the first column's interest rate
- For all scenarios, market_payment = the first column's payment amount; buydown_payment = that column's payment amount
- down_pct = (Down Payment / Purchase Price) * 100, rounded to nearest whole number
- total_subsidy = the "Savings(60 mos)" or cumulative savings value for that column if present, else 0
- All dollar amounts are plain numbers (no $ or commas)
- All rate values are plain numbers as percentages (e.g. 7.625, not 0.07625)
- advisor_name: look for the loan officer or advisor name on the page; use null if not found
- quote_date: look for the report date or quote date in MM/DD/YYYY format; use null if not found
- If any field is not found, use null

TCA Page Content:
${pageText}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: { scenarios?: unknown[]; advisor_name?: unknown; quote_date?: unknown }
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        { error: 'Could not parse TCA data. The page may not be a valid Mortgage Coach report.' },
        { status: 422 }
      )
    }

    if (!Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) {
      return NextResponse.json(
        { error: 'No loan scenarios found in TCA page.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      scenarios: parsed.scenarios,
      advisor_name: parsed.advisor_name ?? null,
      quote_date: parsed.quote_date ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
