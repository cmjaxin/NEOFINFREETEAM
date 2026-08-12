export interface LoanScenario {
  label: string
  purchasePrice: number
  loanAmount: number
  rate: number
  years: number
  monthlyPI: number
  monthlyTotal: number
  color: string
  // ARM-specific fields (undefined for fixed-rate loans)
  isArm?: boolean
  armFixedMonths?: number
  armBalanceAtAdjustment?: number   // remaining balance when rate resets
  armAdjustedRate?: number          // rate after fixed period
  armAdjustedMonthlyPI?: number     // new P&I after adjustment
  armAdjustedMonthlyTotal?: number  // new total after adjustment
}

export interface TCAInputs {
  listPrice: number
  sellerContribution: number
  downPct: number
  marketRate: number
  sa30yrRate: number | null
  saArmRate: number | null
  saArmYears: number
  saArmAdjustedRate: number | null  // rate ARM adjusts to; defaults to marketRate
  hoaMonthly: number
  annualTaxes: number
  annualInsurance: number
}

export function calcMonthlyPI(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12
  const n = years * 12
  if (r === 0 || n === 0) return principal / (n || 1)
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// Remaining balance after m payments at monthly rate r over n total months
function remainingBalance(principal: number, annualRate: number, totalYears: number, elapsedMonths: number): number {
  const r = annualRate / 12
  const n = totalYears * 12
  if (r === 0) return principal - (principal / n) * elapsedMonths
  const payment = calcMonthlyPI(principal, annualRate, totalYears)
  return principal * Math.pow(1 + r, elapsedMonths) - payment * ((Math.pow(1 + r, elapsedMonths) - 1) / r)
}

function monthlyExtras(hoa: number, taxes: number, insurance: number): number {
  return hoa + taxes / 12 + insurance / 12
}

export function buildScenarios(inputs: TCAInputs): LoanScenario[] {
  const {
    listPrice, sellerContribution, downPct, marketRate,
    sa30yrRate, saArmRate, saArmYears, saArmAdjustedRate,
    hoaMonthly, annualTaxes, annualInsurance,
  } = inputs

  const extras = monthlyExtras(hoaMonthly, annualTaxes, annualInsurance)
  const saPurchasePrice = listPrice + sellerContribution
  const scenarios: LoanScenario[] = []

  // ── Market Rate (30yr fixed) ──────────────────────────────────────────────
  const marketLoan = listPrice * (1 - downPct)
  const marketPI = calcMonthlyPI(marketLoan, marketRate, 30)
  scenarios.push({
    label: 'Market Rate',
    purchasePrice: listPrice,
    loanAmount: marketLoan,
    rate: marketRate,
    years: 30,
    monthlyPI: marketPI,
    monthlyTotal: marketPI + extras,
    color: '#6B7280',
  })

  // ── SA 30yr Fixed ─────────────────────────────────────────────────────────
  if (sa30yrRate !== null && sa30yrRate > 0) {
    const saLoan = saPurchasePrice * (1 - downPct)
    const saPI = calcMonthlyPI(saLoan, sa30yrRate, 30)
    scenarios.push({
      label: 'Seller Advantage 30yr Fixed',
      purchasePrice: saPurchasePrice,
      loanAmount: saLoan,
      rate: sa30yrRate,
      years: 30,
      monthlyPI: saPI,
      monthlyTotal: saPI + extras,
      color: '#0A2540',
    })
  }

  // ── SA ARM ────────────────────────────────────────────────────────────────
  if (saArmRate !== null && saArmRate > 0) {
    const saLoan = saPurchasePrice * (1 - downPct)
    const armFixedMonths = saArmYears * 12
    const remainingYears = 30 - saArmYears

    // Payment during fixed period (amortized over full 30yr so equity builds correctly)
    const armPI = calcMonthlyPI(saLoan, saArmRate, 30)

    // Balance remaining when rate adjusts
    const balAtAdjust = remainingBalance(saLoan, saArmRate, 30, armFixedMonths)

    // Rate it adjusts to (default to market rate if not specified)
    const adjustedRate = saArmAdjustedRate ?? marketRate

    // New payment on remaining balance for remaining years
    const adjustedPI = calcMonthlyPI(balAtAdjust, adjustedRate, remainingYears)

    scenarios.push({
      label: `Seller Advantage ${saArmYears}yr ARM`,
      purchasePrice: saPurchasePrice,
      loanAmount: saLoan,
      rate: saArmRate,
      years: saArmYears,
      monthlyPI: armPI,
      monthlyTotal: armPI + extras,
      color: '#5BCBF5',
      isArm: true,
      armFixedMonths,
      armBalanceAtAdjustment: balAtAdjust,
      armAdjustedRate: adjustedRate,
      armAdjustedMonthlyPI: adjustedPI,
      armAdjustedMonthlyTotal: adjustedPI + extras,
    })
  }

  return scenarios
}

// Cumulative monthly costs over `months`, properly modeling ARM rate adjustment
export function cumulativeCost(scenario: LoanScenario, months: number): number {
  if (scenario.isArm && scenario.armFixedMonths && scenario.armAdjustedMonthlyTotal) {
    const fixed = Math.min(months, scenario.armFixedMonths)
    const adjusted = Math.max(0, months - scenario.armFixedMonths)
    return scenario.monthlyTotal * fixed + scenario.armAdjustedMonthlyTotal * adjusted
  }
  return scenario.monthlyTotal * months
}

// True out-of-pocket: down payment + all monthly costs (ARM-aware)
export function totalOutOfPocket(scenario: LoanScenario, months: number, downPct: number): number {
  const downPayment = scenario.purchasePrice * downPct
  return downPayment + cumulativeCost(scenario, months)
}

// Breakeven month: when SA total out-of-pocket drops below market
export function breakevenMonths(market: LoanScenario, sa: LoanScenario, downPct: number): number | null {
  const extraDown = (sa.purchasePrice - market.purchasePrice) * downPct
  if (extraDown <= 0) return 0
  // Walk month by month until SA cumulative savings exceed the extra down payment
  // (needed because ARM makes this non-linear)
  for (let m = 1; m <= 360; m++) {
    const savings = cumulativeCost(market, m) - cumulativeCost(sa, m)
    if (savings >= extraDown) return m
  }
  return null // never breaks even
}

export function fmtDollars(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toFixed(0)}`
}

export function fmtRate(r: number): string {
  return `${(r * 100).toFixed(3).replace(/\.?0+$/, '')}%`
}

export function slugify(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) + '-' + Math.random().toString(36).slice(2, 7)
}
