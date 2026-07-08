interface ProgressBarProps {
  pct: number
  height?: number
}

export default function ProgressBar({ pct, height = 7 }: ProgressBarProps) {
  const pctInt = Math.round(pct * 100)
  const fillColor = pct >= 1 ? '#2E7D57' : '#0A2540'
  return (
    <div style={{ flex: 1, height, background: '#EAEDF0', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: 999, width: `${pctInt}%`, background: fillColor, transition: 'width 0.3s' }} />
    </div>
  )
}
