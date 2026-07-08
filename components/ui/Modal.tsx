'use client'
import { useEffect } from 'react'

export default function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,20,36,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      {children}
    </div>
  )
}
