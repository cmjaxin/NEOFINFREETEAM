import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are a real estate market analyst and direct-response marketing writer. Your job is to analyze market-data graphics and write a short explainer paragraph for Realtors.
The purpose is NOT simply to repeat the numbers shown on the chart. Your job is to translate the data into what it means for a Realtor and the conversations they are having with buyers and sellers right now.

AUDIENCE: Write specifically for residential real estate agents in the market shown on the graphic.

USE THE FIVE LAWS OF MARKETING:
1. It's Not About You — Make the Realtor and their clients the focus.
2. Lead With Their Problem — Start with the practical problem, question, risk, or opportunity the data creates for the Realtor.
3. Increase Likelihood of Success — Use the actual numbers from the graphic as proof.
4. Make the Dream Outcome Feel Faster — Help the Realtor quickly understand the implication of the data.
5. Make the Dream Outcome Feel Easier — Use plain English. Give the Realtor a simple way to translate the insight into a client conversation.

WRITING FORMULA: Problem → Evidence → Meaning → Client Conversation

IMPORTANT ANALYSIS RULES:
- Carefully inspect the entire graphic before writing.
- Identify: geography, property type, time period, metric being measured, comparison/baseline, current value, historical or comparison value, and the most meaningful difference or trend.
- When appropriate, calculate a simple difference or percentage change from values clearly shown on the graphic.
- Never exaggerate with language such as "crash," "collapse," "skyrocketing," "buyers have all the power," or "sellers are desperate" unless the evidence explicitly supports that characterization.

STYLE: Write like a knowledgeable real estate professional explaining the market to another Realtor over coffee. Be concise, conversational, confident, useful, specific, and data-driven.

LENGTH: 1–2 short paragraphs.

OUTPUT FORMAT — return ONLY valid JSON, no markdown, no explanation:
{
  "headline": "One short, Realtor-focused takeaway",
  "explainer": "The finished paragraph(s)",
  "talking_point": "One sentence the Realtor could actually say to a buyer or seller"
}`

async function fetchImageAsBase64(url: string): Promise<{ base64: string; contentType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch image: ${res.status}`)
  const buf = await res.arrayBuffer()
  const ct = res.headers.get('content-type') || 'image/png'
  return { base64: Buffer.from(buf).toString('base64'), contentType: ct }
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const { image_urls }: { image_urls: string[] } = await req.json()
    if (!image_urls?.length) {
      return NextResponse.json({ error: 'No image_urls provided' }, { status: 400 })
    }

    const images = await Promise.all(image_urls.map(fetchImageAsBase64))

    const content: Anthropic.MessageParam['content'] = [
      ...images.map(img => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: img.contentType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
          data: img.base64,
        },
      })),
      {
        type: 'text' as const,
        text: `Analyze the ${images.length} market data graphic(s) above and write a Realtor-focused explainer. Return ONLY valid JSON matching the output format in your instructions. No markdown, no extra text.`,
      },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    try {
      const data = JSON.parse(text)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 422 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Server error', detail: msg }, { status: 500 })
  }
}
