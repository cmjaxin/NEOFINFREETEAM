'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { generatePlanPDF } from '@/lib/calculator-pdf'

interface Plan {
  id: string
  name: string
  planData: Record<string, any>
  updatedAt: string
  createdAt: string
}

interface CalculatorProps {
  email: string
  onLogout: () => void
}

const C = {
  navy: '#0A2540',
  accent: '#5BCBF5',
  white: '#fff',
  bg: '#F4F6F8',
  border: '#E4E8EC',
  muted: '#858889',
  dim: '#5C6570',
  text: '#26303B',
  green: '#16a34a',
  red: '#dc2626',
}

export default function FinancialFreedomCalculator({ email, onLogout }: CalculatorProps) {
  // Plan data
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null)
  const [currentPlanName, setCurrentPlanName] = useState('My Plan')

  // Calculator inputs
  const [homePrice, setHomePrice] = useState('450000')
  const [downPaymentPercent, setDownPaymentPercent] = useState('20')
  const [interestRate, setInterestRate] = useState('6.75')
  const [loanTermYears, setLoanTermYears] = useState('30')
  const [savingsGoal, setSavingsGoal] = useState('50000')
  const [yearsToFreedom, setYearsToFreedom] = useState('10')

  // UI state
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showPlansList, setShowPlansList] = useState(false)
  const [showNewPlanModal, setShowNewPlanModal] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load plans on mount
  useEffect(() => {
    loadPlans()
  }, [])

  // Auto-save on changes
  useEffect(() => {
    if (currentPlan) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      setSaving(true)
      saveTimeoutRef.current = setTimeout(() => savePlan(), 1000)
    }
  }, [
    homePrice,
    downPaymentPercent,
    interestRate,
    loanTermYears,
    savingsGoal,
    yearsToFreedom,
    currentPlanName,
  ])

  const loadPlans = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/calculator/plans?email=${encodeURIComponent(email)}`)
      if (!res.ok) throw new Error('Failed to load plans')

      const { plans: loadedPlans } = await res.json()
      setPlans(loadedPlans || [])

      // Load first plan or create default
      if (loadedPlans?.length > 0) {
        loadPlan(loadedPlans[0])
      } else {
        createNewPlan()
      }
    } catch (err) {
      console.error('Load plans error:', err)
      setError('Failed to load your plans')
      createNewPlan()
    } finally {
      setLoading(false)
    }
  }

  const loadPlan = (plan: Plan) => {
    setCurrentPlan(plan)
    setCurrentPlanName(plan.name)
    const data = plan.planData
    setHomePrice(String(data.homePrice || 450000))
    setDownPaymentPercent(String(data.downPaymentPercent || 20))
    setInterestRate(String(data.interestRate || 6.75))
    setLoanTermYears(String(data.loanTermYears || 30))
    setSavingsGoal(String(data.savingsGoal || 50000))
    setYearsToFreedom(String(data.yearsToFreedom || 10))
  }

  const savePlan = async () => {
    if (!currentPlan) return

    try {
      const planData = {
        homePrice: parseFloat(homePrice) || 0,
        downPaymentPercent: parseFloat(downPaymentPercent) || 0,
        interestRate: parseFloat(interestRate) || 0,
        loanTermYears: parseInt(loanTermYears) || 0,
        savingsGoal: parseFloat(savingsGoal) || 0,
        yearsToFreedom: parseInt(yearsToFreedom) || 0,
      }

      const endpoint = currentPlan.id
        ? `/api/calculator/plans`
        : `/api/calculator/plans`

      const method = currentPlan.id ? 'PUT' : 'POST'
      const body = currentPlan.id
        ? { id: currentPlan.id, email, name: currentPlanName, planData }
        : { email, name: currentPlanName, planData }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Save failed')

      const { plan: updatedPlan } = await res.json()
      setCurrentPlan(updatedPlan)
      setSaving(false)
      setSuccess('Plan saved')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('Save error:', err)
      setSaving(false)
      setError('Failed to save plan')
    }
  }

  const createNewPlan = async () => {
    try {
      const planData = {
        homePrice: 450000,
        downPaymentPercent: 20,
        interestRate: 6.75,
        loanTermYears: 30,
        savingsGoal: 50000,
        yearsToFreedom: 10,
      }

      const res = await fetch('/api/calculator/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: `Plan ${new Date().toLocaleDateString()}`,
          planData,
        }),
      })

      if (!res.ok) throw new Error('Failed to create plan')

      const { plan } = await res.json()
      setCurrentPlan(plan)
      setCurrentPlanName(plan.name)
      setPlans([plan, ...plans])
    } catch (err) {
      console.error('Create plan error:', err)
      setError('Failed to create plan')
    }
  }

  const deletePlan = async (planId: string) => {
    if (!confirm('Delete this plan? This cannot be undone.')) return

    try {
      const res = await fetch('/api/calculator/plans', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: planId, email }),
      })

      if (!res.ok) throw new Error('Delete failed')

      const updatedPlans = plans.filter((p) => p.id !== planId)
      setPlans(updatedPlans)

      if (currentPlan?.id === planId) {
        if (updatedPlans.length > 0) {
          loadPlan(updatedPlans[0])
        } else {
          createNewPlan()
        }
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('Failed to delete plan')
    }
  }

  const downloadPDF = async () => {
    try {
      setGenerating(true)
      const result = await generatePlanPDF(
        currentPlanName,
        email,
        {
          homePrice: parseFloat(homePrice),
          downPaymentPercent: parseFloat(downPaymentPercent),
          interestRate: parseFloat(interestRate),
          loanTermYears: parseInt(loanTermYears),
          savingsGoal: parseFloat(savingsGoal),
          yearsToFreedom: parseInt(yearsToFreedom),
        }
      )

      if (!result.success) {
        setError(result.error || 'PDF generation failed')
      }
    } catch (err) {
      console.error('PDF error:', err)
      setError('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  // Calculations
  const downPayment = (parseFloat(homePrice) || 0) * ((parseFloat(downPaymentPercent) || 0) / 100)
  const loanAmount = (parseFloat(homePrice) || 0) - downPayment
  const monthlyRate = (parseFloat(interestRate) || 0) / 100 / 12
  const numberOfPayments = parseInt(loanTermYears) * 12
  const monthlyPayment =
    loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontSize: 14,
    color: C.text,
    outline: 'none',
    background: C.white,
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: C.dim,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 8 }}>
            Loading your plans...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div
        style={{
          background: C.navy,
          color: C.white,
          padding: '20px 24px',
          borderBottom: `1px solid ${C.accent}`,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: '-0.5px' }}>
              💰 Financial Freedom Calculator
            </h1>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              Logged in as: {email}
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: C.white,
              border: `1px solid rgba(255,255,255,0.2)`,
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* Messages */}
        {error && (
          <div
            style={{
              background: '#FEE2E2',
              border: `1px solid #FECACA`,
              color: '#991B1B',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: '#DCFCE7',
              border: `1px solid #BBF7D0`,
              color: '#166534',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {success}
          </div>
        )}

        {/* Plan selector and actions */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 24,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Current Plan</label>
            <input
              type="text"
              value={currentPlanName}
              onChange={(e) => setCurrentPlanName(e.target.value)}
              style={{
                ...inputStyle,
                fontWeight: 600,
              }}
              placeholder="Plan name"
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowPlansList(!showPlansList)}
              style={{
                padding: '10px 16px',
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: C.navy,
              }}
            >
              📋 {plans.length} Plan{plans.length !== 1 ? 's' : ''}
            </button>

            <button
              onClick={() => setShowNewPlanModal(true)}
              style={{
                padding: '10px 16px',
                background: C.accent,
                color: C.navy,
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ➕ New Plan
            </button>

            <button
              onClick={downloadPDF}
              disabled={generating}
              style={{
                padding: '10px 16px',
                background: C.green,
                color: C.white,
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? '⏳ Generating...' : '📥 Download PDF'}
            </button>
          </div>

          {saving && (
            <div style={{ fontSize: 12, color: C.muted }}>
              💾 Saving...
            </div>
          )}
        </div>

        {/* Plans list modal */}
        {showPlansList && (
          <div
            style={{
              background: C.white,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
              border: `1px solid ${C.border}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.navy }}>
                Your Plans
              </h3>
              <button
                onClick={() => setShowPlansList(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 16,
                  cursor: 'pointer',
                  color: C.dim,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    background: currentPlan?.id === plan.id ? C.accent : C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => loadPlan(plan)}
                >
                  <div style={{ fontWeight: 600, color: C.navy, marginBottom: 4, fontSize: 14 }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>
                    Updated {new Date(plan.updatedAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePlan(plan.id)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: C.red,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculator grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* Inputs section */}
          <div style={{ background: C.white, borderRadius: 8, padding: 24, border: `1px solid ${C.border}` }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: C.navy }}>
              Inputs
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Home Price</label>
                <input
                  type="number"
                  value={homePrice}
                  onChange={(e) => setHomePrice(e.target.value)}
                  style={inputStyle}
                  placeholder="450000"
                />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Total purchase price
                </div>
              </div>

              <div>
                <label style={labelStyle}>Down Payment %</label>
                <input
                  type="number"
                  value={downPaymentPercent}
                  onChange={(e) => setDownPaymentPercent(e.target.value)}
                  style={inputStyle}
                  placeholder="20"
                />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Percentage of home price
                </div>
              </div>

              <div>
                <label style={labelStyle}>Interest Rate %</label>
                <input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  step="0.01"
                  style={inputStyle}
                  placeholder="6.75"
                />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Annual interest rate
                </div>
              </div>

              <div>
                <label style={labelStyle}>Loan Term (Years)</label>
                <input
                  type="number"
                  value={loanTermYears}
                  onChange={(e) => setLoanTermYears(e.target.value)}
                  style={inputStyle}
                  placeholder="30"
                />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Mortgage duration
                </div>
              </div>

              <div>
                <label style={labelStyle}>Savings Goal</label>
                <input
                  type="number"
                  value={savingsGoal}
                  onChange={(e) => setSavingsGoal(e.target.value)}
                  style={inputStyle}
                  placeholder="50000"
                />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Target savings amount
                </div>
              </div>

              <div>
                <label style={labelStyle}>Years to Financial Freedom</label>
                <input
                  type="number"
                  value={yearsToFreedom}
                  onChange={(e) => setYearsToFreedom(e.target.value)}
                  style={inputStyle}
                  placeholder="10"
                />
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Target timeframe
                </div>
              </div>
            </div>
          </div>

          {/* Results section */}
          <div style={{ background: C.white, borderRadius: 8, padding: 24, border: `1px solid ${C.border}` }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700, color: C.navy }}>
              Results
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: C.bg, padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 4, textTransform: 'uppercase' }}>
                  Down Payment
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.navy }}>
                  ${Math.round(downPayment).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {downPaymentPercent}% of home price
                </div>
              </div>

              <div style={{ background: C.bg, padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 4, textTransform: 'uppercase' }}>
                  Loan Amount
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.navy }}>
                  ${Math.round(loanAmount).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Amount to finance
                </div>
              </div>

              <div style={{ background: C.accent, padding: 16, borderRadius: 8, color: C.navy }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                  Monthly Payment
                </div>
                <div style={{ fontSize: 32, fontWeight: 900 }}>
                  ${Math.round(monthlyPayment).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                  Principal + interest + taxes + insurance estimate
                </div>
              </div>

              <div style={{ background: C.bg, padding: 16, borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dim, marginBottom: 4, textTransform: 'uppercase' }}>
                  Total Interest Paid
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.red }}>
                  ${Math.round(monthlyPayment * numberOfPayments - loanAmount).toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Over {loanTermYears} years
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Plan Modal */}
      {showNewPlanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowNewPlanModal(false)}
        >
          <div
            style={{
              background: C.white,
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: 20, fontWeight: 700, color: C.navy }}>
              Create New Plan
            </h2>

            <input
              type="text"
              placeholder="Plan name"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              style={{
                ...inputStyle,
                marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setShowNewPlanModal(false)
                  setNewPlanName('')
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newPlanName.trim()) {
                    setCurrentPlanName(newPlanName)
                    createNewPlan()
                    setShowNewPlanModal(false)
                    setNewPlanName('')
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: C.accent,
                  color: C.navy,
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
