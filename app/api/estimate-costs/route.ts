import { NextRequest, NextResponse } from 'next/server'

// Effective property tax rates by state (median %, source: Tax Foundation 2024)
const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.41, AK: 1.04, AZ: 0.60, AR: 0.62, CA: 0.73, CO: 0.49, CT: 1.79,
  DE: 0.57, FL: 0.86, GA: 0.87, HI: 0.29, ID: 0.63, IL: 2.08, IN: 0.83,
  IA: 1.52, KS: 1.33, KY: 0.80, LA: 0.55, ME: 1.09, MD: 1.09, MA: 1.14,
  MI: 1.44, MN: 1.08, MS: 0.65, MO: 0.97, MT: 0.74, NE: 1.54, NV: 0.55,
  NH: 1.89, NJ: 2.23, NM: 0.67, NY: 1.46, NC: 0.78, ND: 0.98, OH: 1.59,
  OK: 0.87, OR: 0.91, PA: 1.49, RI: 1.53, SC: 0.56, SD: 1.14, TN: 0.67,
  TX: 1.60, UT: 0.55, VT: 1.73, VA: 0.82, WA: 0.84, WV: 0.57, WI: 1.73,
  WY: 0.57, DC: 0.55,
}

// Annual homeowner insurance estimate: ~0.5–1% of home value depending on state
const STATE_INS_RATES: Record<string, number> = {
  FL: 1.98, LA: 1.74, OK: 1.36, TX: 1.30, MS: 1.25, AL: 1.10, AR: 1.06,
  KS: 1.04, MO: 0.98, CO: 0.75, MT: 0.75, WY: 0.73, NE: 0.73, SD: 0.72,
  MN: 0.69, ND: 0.69, IA: 0.67, IL: 0.67, IN: 0.67, KY: 0.65, TN: 0.65,
  WI: 0.63, GA: 0.60, NC: 0.60, SC: 0.60, VA: 0.56, AZ: 0.55, NM: 0.55,
  NV: 0.50, UT: 0.50, ID: 0.50, WA: 0.50, OR: 0.48, CA: 0.45, MA: 0.45,
  CT: 0.45, NY: 0.45, NJ: 0.44, PA: 0.44, MD: 0.42, DE: 0.42, RI: 0.42,
  NH: 0.40, ME: 0.40, VT: 0.40, AK: 0.40, HI: 0.35,
}

function getDefaultRate(map: Record<string, number>, stateCode: string, defaultRate: number): number {
  return map[stateCode?.toUpperCase()] ?? defaultRate
}

export async function POST(req: NextRequest) {
  try {
    const { zip, state, listPrice } = await req.json()
    if (!listPrice || (!zip && !state)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const stateCode = (state ?? '').toUpperCase()
    const price = Number(listPrice)

    const taxRatePct = getDefaultRate(STATE_TAX_RATES, stateCode, 1.0)
    const insRatePct = getDefaultRate(STATE_INS_RATES, stateCode, 0.65)

    const annualTax = price * taxRatePct / 100
    const annualIns = price * insRatePct / 100

    const monthlyTax = annualTax / 12
    const monthlyInsurance = annualIns / 12

    const stateName = stateCode || 'your state'
    const note = `Based on ${taxRatePct.toFixed(2)}% avg tax rate & ${insRatePct.toFixed(2)}% insurance rate for ${stateName}. Adjust as needed.`

    return NextResponse.json({ monthlyTax, monthlyInsurance, note })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
