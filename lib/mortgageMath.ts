// Core mortgage math utilities

export interface BuydownSchedule {
  year: number
  rate: number
  pi: number
  piti: number
}

export interface ScenarioInputs {
  listPrice: number
  downPct: number
  loanType: 'Conventional' | 'FHA' | 'VA' | 'USDA'
  noteRate: number       // e.g. 7.375 (percent)
  termYears: number      // 30
  buydownType: 'none' | '1-0' | '2-1' | '3-2-1' | 'permanent'
  permanentRate?: number   // used only when buydownType === 'permanent'
  customBuydownRate?: number // override year-1 rate for temp buydowns
  // PITI extras
  monthlyTax: number
  monthlyInsurance: number
  monthlyHoa: number
  miRatePct?: number     // conventional MI, e.g. 0.5 (percent/yr). If omitted, auto-estimated.
  label?: string
  apr?: number
}

export interface ScenarioResult {
  label: string
  loanAmount: number
  downPct: number
  noteRate: number
  buydownRate: number    // first-year effective rate (or permanent rate)
  marketPayment: number  // P&I at note rate (final/permanent payment)
  buydownPayment: number // P&I at first-year buydown rate
  apr: number
  schedule: BuydownSchedule[]
  finalPITI: number
  totalSubsidy: number   // total buydown cost (P&I difference × months per year)
  loanType: string
  termYears: number
}

function monthlyPI(principal: number, annualRatePct: number, termYears: number): number {
  if (annualRatePct === 0) return principal / (termYears * 12)
  const r = annualRatePct / 100 / 12
  const n = termYears * 12
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function yearRates(noteRate: number, buydownType: ScenarioInputs['buydownType'], permanentRate?: number): number[] {
  // Returns rate for years 1, 2, 3, 4+ (index 0=yr1, 3=permanent)
  switch (buydownType) {
    case '3-2-1': return [noteRate - 3, noteRate - 2, noteRate - 1, noteRate]
    case '2-1':   return [noteRate - 2, noteRate - 1, noteRate, noteRate]
    case '1-0':   return [noteRate - 1, noteRate, noteRate, noteRate]
    case 'permanent': {
      const pr = permanentRate ?? noteRate
      return [pr, pr, pr, pr]
    }
    case 'none':
    default: return [noteRate, noteRate, noteRate, noteRate]
  }
}

function fhaMonthlyMIP(loanAmount: number, termYears: number, ltv: number): number {
  // Current FHA MIP: 0.55% annual for most 30yr loans
  let annual = 0.55
  if (ltv <= 90 && termYears > 15) annual = 0.50
  return loanAmount * annual / 100 / 12
}

function convMI(loanAmount: number, miRatePct: number): number {
  return loanAmount * miRatePct / 100 / 12
}

export function calculateScenario(inputs: ScenarioInputs): ScenarioResult {
  const {
    listPrice, downPct, loanType, noteRate, termYears = 30, buydownType,
    permanentRate, monthlyTax, monthlyInsurance, monthlyHoa, label = '',
  } = inputs

  const downAmt = listPrice * downPct / 100
  const loanAmount = listPrice - downAmt
  const ltv = (loanAmount / listPrice) * 100

  // MI
  let mi = 0
  const miRate = inputs.miRatePct
  if (loanType === 'FHA') {
    mi = fhaMonthlyMIP(loanAmount, termYears, ltv)
  } else if (loanType === 'Conventional' && ltv > 80) {
    mi = convMI(loanAmount, miRate ?? estimateConvMI(ltv, noteRate))
  }

  const extras = monthlyTax + monthlyInsurance + monthlyHoa + mi

  const rates = yearRates(noteRate, buydownType, permanentRate)
  // Override year-1 rate if advisor specified a custom buydown rate
  if (inputs.customBuydownRate != null && buydownType !== 'none' && buydownType !== 'permanent') {
    rates[0] = inputs.customBuydownRate
  }
  const marketPI = monthlyPI(loanAmount, noteRate, termYears)
  const marketPITI = marketPI + extras

  // Buydown schedule (up to 3 buydown years, then permanent)
  const schedule: BuydownSchedule[] = rates.map((r, i) => {
    const pi = monthlyPI(loanAmount, r, termYears)
    return { year: i + 1, rate: r, pi, piti: pi + extras }
  })

  // Total subsidy = sum of (note_payment - buydown_payment) × 12 for each buydown year
  let totalSubsidy = 0
  for (let i = 0; i < 3; i++) {
    if (rates[i] < noteRate) {
      totalSubsidy += (marketPI - schedule[i].pi) * 12
    }
  }

  const firstYearRate = rates[0]
  const firstYearPI = schedule[0].pi

  // Simple APR approximation (note rate + upfront cost amortized) — use real value if provided
  const apr = inputs.apr ?? (buydownType === 'permanent' && permanentRate
    ? permanentRate + 0.1
    : noteRate + 0.25)

  const scenLabel = label || buildLabel(loanType, termYears, downPct, buydownType)

  return {
    label: scenLabel,
    loanAmount,
    downPct,
    noteRate,
    buydownRate: firstYearRate,
    marketPayment: Math.round(marketPI * 100) / 100,
    buydownPayment: Math.round(firstYearPI * 100) / 100,
    apr,
    schedule,
    finalPITI: Math.round(marketPITI * 100) / 100,
    totalSubsidy: Math.round(totalSubsidy),
    loanType,
    termYears,
  }
}

function estimateConvMI(ltv: number, noteRate: number): number {
  if (ltv > 95) return 1.1
  if (ltv > 90) return 0.9
  if (ltv > 85) return 0.7
  return 0.5
}

function buildLabel(loanType: string, termYears: number, downPct: number, buydownType: string): string {
  const bd = buydownType === 'none' ? 'Market Rate'
    : buydownType === 'permanent' ? 'Permanent Buydown'
    : `${buydownType} Buydown`
  return `${loanType} ${termYears}yr · ${downPct}% Down · ${bd}`
}

export function toRateScenario(r: ScenarioResult) {
  return {
    label: r.label,
    down_pct: r.downPct,
    loan_type: r.loanType,
    term_years: r.termYears,
    market_rate: r.noteRate,
    buydown_rate: r.buydownRate,
    market_payment: r.marketPayment,
    buydown_payment: r.buydownPayment,
    apr: r.apr,
    // Extended fields for year-by-year display
    piti_schedule: r.schedule,
    final_piti: r.finalPITI,
    total_subsidy: r.totalSubsidy,
  }
}
