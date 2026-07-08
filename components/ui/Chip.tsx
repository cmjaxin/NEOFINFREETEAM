interface ChipProps {
  label: string
  bg: string
  fg: string
  size?: 'sm' | 'md'
}

export default function Chip({ label, bg, fg, size = 'sm' }: ChipProps) {
  const padding = size === 'md' ? '4px 11px' : '3px 9px'
  const fontSize = size === 'md' ? 12 : 11.5
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding, borderRadius: 999,
      fontSize, fontWeight: 600,
      background: bg, color: fg,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
