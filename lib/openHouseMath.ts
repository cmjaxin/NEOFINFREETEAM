export interface LoanScenario {
  label: string
  purchasePrice: number
  loanAmount: number
  rate: number
  years: number
  monthlyPI: number
  monthlyTotal: number
  color: string
}

export interface TCAInputs {
  listPrice: number
  sellerContribution: number
  downPct: number
  marketRate: number
  sa30yrRate: number | null
  saArmRate: number | null
  saArmYears: number
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

function monthlyExtras(hoa: number, taxes: number, insurance: number): number {
  return hoa + taxes / 12 + insurance / 12
}

export function buildScenarios(inputs: TCAInputs): LoanScenario[] {
  const { listPrice, sellerContribution, downPct, marketRate, sa30yrRate, saArmRate, saArmYears,
    hoaMonthly, annualTaxes, annualInsurance } = inputs

  const extras = monthlyExtras(hoaMonthly, annualTaxes, annualInsurance)
  const saPurchasePrice = listPrice + sellerContribution

  const scenarios: LoanScenario[] = []

  // Market rate scenario
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

  // SA 30yr fixed
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

  // SA ARM
  if (saArmRate !== null && saArmRate > 0) {
    const saLoan = saPurchasePrice * (1 - downPct)
    const saPI = calcMonthlyPI(saLoan, saArmRate, 30)
    scenarios.push({
      label: `Seller Advantage ${saArmYears}yr ARM`,
      purchasePrice: saPurchasePrice,
      loanAmount: saLoan,
      rate: saArmRate,
      years: saArmYears,
      monthlyPI: saPI,
      monthlyTotal: saPI + extras,
      color: '#5BCBF5',
    })
  }

  return scenarios
}

export function cumulativeCost(scenario: LoanScenario, months: number): number {
  return scenario.monthlyTotal * months
}

// True out-of-pocket: includes down payment + all monthly costs over the period
export function totalOutOfPocket(scenario: LoanScenario, months: number, downPct: number): number {
  const downPayment = scenario.purchasePrice * downPct
  return downPayment + scenario.monthlyTotal * months
}

// Monthly savings vs the first (market rate) scenario
export function monthlySavingsVsMarket(scenarios: LoanScenario[], idx: number): number {
  if (idx === 0 || scenarios.length < 2) return 0
  return scenarios[0].monthlyTotal - scenarios[idx].monthlyTotal
}

// Breakeven month: when SA cumulative savings exceed the extra down payment
export function breakevenMonths(market: LoanScenario, sa: LoanScenario, downPct: number): number | null {
  const extraDown = (sa.purchasePrice - market.purchasePrice) * downPct
  const monthlySavings = market.monthlyTotal - sa.monthlyTotal
  if (monthlySavings <= 0) return null
  return Math.ceil(extraDown / monthlySavings)
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
