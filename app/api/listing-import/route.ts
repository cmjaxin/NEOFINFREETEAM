import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// US state abbreviations for URL slug parsing
const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
])

/**
 * Parse address fields from a Zillow/Realtor.com/Redfin URL slug.
 * Example slug: "14496-S-Fox-Creek-Dr-Herriman-UT-84096"
 * Returns partial fields — price/beds/baths/sqft will still be null.
 */
function parseFromUrl(rawUrl: string): Record<string, string | null> {
  try {
    const u = new URL(rawUrl)
    const host = u.hostname.replace('www.', '')
    let slug = ''

    if (host === 'zillow.com') {
      // /homedetails/SLUG/zpid/
      const m = u.pathname.match(/\/homedetails\/([^/]+)/)
      if (m) slug = m[1]
    } else if (host === 'realtor.com') {
      // /realestateandhomes-detail/SLUG
      const m = u.pathname.match(/\/realestateandhomes-detail\/([^/]+)/)
      if (m) slug = m[1]
    } else if (host === 'redfin.com') {
      // /STATE/City/ADDR/home/id  — take last path segment before /home
      const parts = u.pathname.split('/').filter(Boolean)
      const homeIdx = parts.indexOf('home')
      if (homeIdx > 0) slug = parts.slice(0, homeIdx).join('-')
    }

    if (!slug) return {}

    // Slug is dash-separated tokens. Find the state token.
    const tokens = slug.split('-')
    let stateIdx = -1
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (US_STATES.has(tokens[i].toUpperCase())) { stateIdx = i; break }
    }
    if (stateIdx < 1) return {}

    const state = tokens[stateIdx].toUpperCase()
    // Zip is usually right after the state
    const zip = /^\d{5}$/.test(tokens[stateIdx + 1] ?? '') ? tokens[stateIdx + 1] : null
    // City is the token(s) right before the state — scan back for multi-word cities
    // Heuristic: city tokens start with uppercase (title-cased in slug is just first letter)
    // We take 1–3 tokens before state as city
    const cityTokens: string[] = []
    for (let i = stateIdx - 1; i >= Math.max(0, stateIdx - 3); i--) {
      if (/^\d/.test(tokens[i])) break  // hit street number, stop
      cityTokens.unshift(tokens[i])
    }
    const city = cityTokens.map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ') || null
    // Address is everything before city tokens
    const addrTokens = tokens.slice(0, stateIdx - cityTokens.length)
    const address = addrTokens.map(t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()).join(' ') || null

    return { address, city, state, zip }
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    // Validate URL is a known listing site or generic http/https
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'URL must be http or https' }, { status: 400 })
    }

    // Try Jina.ai reader first — it handles JS-rendered pages and bypasses bot blocks.
    // Free tier, no key required. Returns clean text/markdown.
    let trimmed = ''
    let fetchedViaJina = false

    try {
      const jinaUrl = `https://r.jina.ai/${url}`
      const jinaRes = await fetch(jinaUrl, {
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'text',
        },
        signal: AbortSignal.timeout(20000),
      })
      if (jinaRes.ok) {
        const jinaText = await jinaRes.text()
        // Jina returns clean markdown-ish text — trim to 60k chars for the prompt
        trimmed = jinaText.length > 60_000 ? jinaText.slice(0, 60_000) : jinaText
        fetchedViaJina = true
      }
    } catch { /* fall through to direct fetch */ }

    // Fall back: direct fetch with browser headers
    if (!fetchedViaJina) {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(12000),
      }).catch(() => null)

      if (!pageRes?.ok) {
        // Both methods failed — parse what we can from the URL slug
        const urlParsed = parseFromUrl(url)
        const hasPartial = !!(urlParsed.address || urlParsed.city)
        const siteName = parsedUrl.hostname.replace('www.', '')
        const hint = `${siteName} is blocking automated requests. ${hasPartial ? 'Address pre-filled from URL — ' : ''}Fill in the remaining details manually.`
        return NextResponse.json(
          {
            partial: true, hint,
            address: urlParsed.address ?? null,
            city: urlParsed.city ?? null,
            state: urlParsed.state ?? null,
            zip: urlParsed.zip ?? null,
            list_price: null, beds: null, baths: null, sqft: null,
            lot_size: null, year_built: null, description: null, photos: [],
          },
          { status: hasPartial ? 200 : 422 }
        )
      }

      const rawHtml = await pageRes.text()
      trimmed = rawHtml.length > 80_000
        ? rawHtml.slice(0, 40_000) + '\n<!-- ...truncated... -->\n' + rawHtml.slice(-8_000)
        : rawHtml
    }

    const prompt = `You are extracting real estate listing data from an HTML page. Return ONLY valid JSON with these exact keys — no markdown, no commentary.

{
  "address": "street address only, no city/state/zip",
  "city": "city name",
  "state": "2-letter state code",
  "zip": "zip code",
  "list_price": 450000,
  "beds": 4,
  "baths": 2.5,
  "sqft": 2200,
  "lot_size": "0.25 acres",
  "year_built": 2001,
  "description": "full property description text",
  "photos": ["https://...", "https://..."]
}

Rules:
- list_price is a number (no $ or commas)
- beds/baths/sqft are numbers (not strings)
- lot_size is a string like "7,200 sqft" or "0.17 acres"
- photos: extract up to 25 direct image URLs from img src, og:image, JSON-LD, or photo arrays. Only include URLs ending in .jpg, .jpeg, .png, .webp or containing known CDN patterns (photos.zillowstatic.com, ap.rdcpix.com, ssl.cdn-redfin.com, photos.mlslistings.com). Exclude icons, logos, maps, tiny thumbnails.
- If a field is not found, use null
- description: include the full text of the property description

HTML:
${trimmed}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    // Strip any markdown code fences if present
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'Could not parse listing data. The page may require login or is behind a paywall.' }, { status: 422 })
    }

    // Sanitize and return
    const photos = Array.isArray(parsed.photos)
      ? (parsed.photos as unknown[]).filter((p): p is string => typeof p === 'string' && p.startsWith('http')).slice(0, 25)
      : []

    return NextResponse.json({
      address: parsed.address ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      zip: parsed.zip ?? null,
      list_price: typeof parsed.list_price === 'number' ? parsed.list_price : null,
      beds: typeof parsed.beds === 'number' ? parsed.beds : null,
      baths: typeof parsed.baths === 'number' ? parsed.baths : null,
      sqft: typeof parsed.sqft === 'number' ? parsed.sqft : null,
      lot_size: parsed.lot_size ?? null,
      year_built: typeof parsed.year_built === 'number' ? parsed.year_built : null,
      description: parsed.description ?? null,
      photos,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
