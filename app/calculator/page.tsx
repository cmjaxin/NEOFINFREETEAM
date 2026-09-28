'use client'
import { useState, useEffect } from 'react'
import CalculatorAuth from '@/components/CalculatorAuth'
import FinancialFreedomCalculator from '@/components/FinancialFreedomCalculator'

export default function CalculatorPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check if user has email in session storage (from magic link)
  useEffect(() => {
    const storedEmail = sessionStorage.getItem('calculator_email')
    const storedTimestamp = sessionStorage.getItem('calculator_timestamp')

    // Check if session is still valid (24 hours)
    if (storedEmail && storedTimestamp) {
      const timestamp = parseInt(storedTimestamp)
      const now = Date.now()
      const hours24 = 24 * 60 * 60 * 1000

      if (now - timestamp < hours24) {
        setEmail(storedEmail)
      } else {
        sessionStorage.removeItem('calculator_email')
        sessionStorage.removeItem('calculator_timestamp')
      }
    }
    setLoading(false)
  }, [])

  const handleAuth = (userEmail: string) => {
    setEmail(userEmail)
    sessionStorage.setItem('calculator_email', userEmail)
    sessionStorage.setItem('calculator_timestamp', Date.now().toString())
  }

  const handleLogout = () => {
    setEmail(null)
    sessionStorage.removeItem('calculator_email')
    sessionStorage.removeItem('calculator_timestamp')
  }

  if (loading) {
    return null
  }

  return email ? (
    <FinancialFreedomCalculator email={email} onLogout={handleLogout} />
  ) : (
    <CalculatorAuth onAuth={handleAuth} />
  )
}
