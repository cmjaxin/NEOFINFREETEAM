import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { screenshot_url } = await req.json()
  if (!screenshot_url) return NextResponse.json({ error: 'Missing screenshot_url' }, { status: 400 })

  // Fetch the image and convert to base64
  const imgRes = await fetch(screenshot_url)
  if (!imgRes.ok) return NextResponse.json({ error: 'Could not fetch image' }, { status: 400 })
  const imgBuffer = await imgRes.arrayBuffer()
  const base64 = Buffer.from(imgBuffer).toString('base64')
  const contentType = (imgRes.headers.get('content-type') || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: contentType, data: base64 }
        },
        {
          type: 'text',
          text: `This is a Total Cost Analysis or rate comparison document for a real estate listing. Extract the key financing data and return ONLY valid JSON in this exact shape (no markdown, no explanation):

{
  "seller_contribution": 0,
  "seller_contribution_pct": 0,
  "scenarios": [
    {
      "label": "Conventional 30yr · 5% Down",
      "down_pct": 5,
      "market_rate": 7.25,
      "buydown_rate": 6.875,
      "market_payment": 4779,
      "buydown_payment": 4627,
      "loan_type": "Conventional",
      "term_years": 30,
      "apr": 7.2
    }
  ]
}

Rules:
- seller_contribution: dollar amount the seller is paying toward rate buydown (0 if not shown)
- seller_contribution_pct: that amount as % of purchase price (0 if not calculable)
- Include every distinct scenario visible (VA, FHA, Conventional, 15yr, 30yr, ARM, etc.)
- market_rate: the standard/market rate WITHOUT the buydown (if only one rate shown, use it for both)
- buydown_rate: the reduced rate WITH the seller buydown applied
- market_payment and buydown_payment: monthly P&I payments (just the number, no $ sign)
- loan_type: "VA", "FHA", "Conventional", or "ARM"
- term_years: 15 or 30
- apr: APR if shown, else 0
- If the document only shows one rate (no buydown), set market_rate = buydown_rate and market_payment = buydown_payment
- Return only the JSON object, nothing else`
        }
      ]
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  try {
    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 422 })
  }
}
