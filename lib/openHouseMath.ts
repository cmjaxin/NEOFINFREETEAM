export interface LoanScenario {
  label: string
  purchasePrice: number
  baseLoanAmount: number
  ufmip: number
  loanAmount: number         // final loan = baseLoan + ufmip
  rate: number
  years: number
  monthlyPI: number          // P&I only (on final loan amount)
  monthlyMip: number         // monthly MIP (0 for conventional)
  monthlyTotal: number       // P&I + MIP + taxes/hoa/ins
  annualMipPct: number       // 0.0055 FHA, 0 conventional
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
  ufmipPct: number        // 0.0175 for FHA, 0 for conventional
  annualMipPct: number    // 0.0055 for FHA, 0 for conventional
}

export function calcMonthlyPI(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 12
  const n = years * 12
  if (r === 0 || n === 0) return principal / (n || 1)
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// Remaining balance after elapsedMonths of payments (using base rate for fixed loans)
export function remainingBalance(principal: number, annualRate: number, totalYears: number, elapsedMonths: number): number {
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
    ufmipPct, annualMipPct,
  } = inputs

  const extras = monthlyExtras(hoaMonthly, annualTaxes, annualInsurance)
  const saPurchasePrice = listPrice + sellerContribution
  const scenarios: LoanScenario[] = []

  // Helper: build base+ufmip loan
  function computeLoan(purchasePrice: number) {
    const base = purchasePrice * (1 - downPct)
    const ufmip = base * ufmipPct
    const final = base + ufmip
    return { base, ufmip, final }
  }

  // ── Market Rate (30yr fixed) ──────────────────────────────────────────────
  const market = computeLoan(listPrice)
  const marketPI = calcMonthlyPI(market.final, marketRate, 30)
  const marketMip = market.final * annualMipPct / 12
  scenarios.push({
    label: 'Market Rate',
    purchasePrice: listPrice,
    baseLoanAmount: market.base,
    ufmip: market.ufmip,
    loanAmount: market.final,
    rate: marketRate,
    years: 30,
    monthlyPI: marketPI,
    monthlyMip: marketMip,
    monthlyTotal: marketPI + marketMip + extras,
    annualMipPct,
    color: '#6B7280',
  })

  // ── SA 30yr Fixed ─────────────────────────────────────────────────────────
  if (sa30yrRate !== null && sa30yrRate > 0) {
    const sa = computeLoan(saPurchasePrice)
    const saPI = calcMonthlyPI(sa.final, sa30yrRate, 30)
    const saMip = sa.final * annualMipPct / 12
    scenarios.push({
      label: 'Seller Advantage 30yr Fixed',
      purchasePrice: saPurchasePrice,
      baseLoanAmount: sa.base,
      ufmip: sa.ufmip,
      loanAmount: sa.final,
      rate: sa30yrRate,
      years: 30,
      monthlyPI: saPI,
      monthlyMip: saMip,
      monthlyTotal: saPI + saMip + extras,
      annualMipPct,
      color: '#0A2540',
    })
  }

  // ── SA ARM ────────────────────────────────────────────────────────────────
  if (saArmRate !== null && saArmRate > 0) {
    const sa = computeLoan(saPurchasePrice)
    const armFixedMonths = saArmYears * 12
    const remainingYears = 30 - saArmYears

    // Payment during fixed period (amortized over full 30yr so equity builds correctly)
    const armPI = calcMonthlyPI(sa.final, saArmRate, 30)
    const armMip = sa.final * annualMipPct / 12

    // Balance remaining when rate adjusts
    const balAtAdjust = remainingBalance(sa.final, saArmRate, 30, armFixedMonths)

    // Rate it adjusts to (default to market rate if not specified)
    const adjustedRate = saArmAdjustedRate ?? marketRate

    // New payment on remaining balance for remaining years
    const adjustedPI = calcMonthlyPI(balAtAdjust, adjustedRate, remainingYears)
    const adjustedMip = balAtAdjust * annualMipPct / 12

    scenarios.push({
      label: `Seller Advantage ${saArmYears}yr ARM`,
      purchasePrice: saPurchasePrice,
      baseLoanAmount: sa.base,
      ufmip: sa.ufmip,
      loanAmount: sa.final,
      rate: saArmRate,
      years: saArmYears,
      monthlyPI: armPI,
      monthlyMip: armMip,
      monthlyTotal: armPI + armMip + extras,
      annualMipPct,
      color: '#5BCBF5',
      isArm: true,
      armFixedMonths,
      armBalanceAtAdjustment: balAtAdjust,
      armAdjustedRate: adjustedRate,
      armAdjustedMonthlyPI: adjustedPI,
      armAdjustedMonthlyTotal: adjustedPI + adjustedMip + extras,
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
  for (let m = 1; m <= 360; m++) {
    const savings = cumulativeCost(market, m) - cumulativeCost(sa, m)
    if (savings >= extraDown) return m
  }
  return null
}

// Equity advantage of SA vs market at month N
// = (sa_equity) - (market_equity) = (sa_home_value - sa_balance) - (market_home_value - market_balance)
export function equityAdvantage(market: LoanScenario, sa: LoanScenario, months: number): number {
  const marketBal = remainingBalance(market.loanAmount, market.rate, market.years, months)
  const saBal = sa.isArm && sa.armFixedMonths && sa.armAdjustedRate && months > sa.armFixedMonths
    ? remainingBalance(
        remainingBalance(sa.loanAmount, sa.rate, 30, sa.armFixedMonths),
        sa.armAdjustedRate,
        30 - sa.armFixedMonths / 12,
        months - sa.armFixedMonths,
      )
    : remainingBalance(sa.loanAmount, sa.rate, 30, months)
  return (sa.purchasePrice - saBal) - (market.purchasePrice - marketBal)
}

// True wealth savings = payment savings + equity advantage (for ARM, handles two phases)
export function wealthSavings(market: LoanScenario, sa: LoanScenario, months: number): number {
  const paymentSavings = cumulativeCost(market, months) - cumulativeCost(sa, months)
  return paymentSavings + equityAdvantage(market, sa, months)
}

// Total interest + MIP paid over the life (360 months), computed from amortization schedule
export function totalInterestAndMI(scenario: LoanScenario): number {
  let total = 0
  let balance = scenario.loanAmount
  const r = scenario.rate / 12
  const mipRate = scenario.annualMipPct / 12

  for (let m = 1; m <= 360; m++) {
    const isAdjusted = scenario.isArm && scenario.armFixedMonths && m > scenario.armFixedMonths
    const monthlyRate = isAdjusted ? (scenario.armAdjustedRate! / 12) : r

    const interest = balance * monthlyRate
    const mip = balance * mipRate
    total += interest + mip

    const payment = isAdjusted ? scenario.armAdjustedMonthlyPI! : scenario.monthlyPI
    const principal = payment - interest
    balance = Math.max(0, balance - principal)
  }
  return total
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
