'use client'
import { initials, roleMeta } from '@/lib/utils'
import { OnboardingRole } from '@/lib/types'

interface AvatarProps {
  name: string
  role: OnboardingRole
  headshotUrl?: string | null
  size?: number
  fontSize?: number
  radius?: number
}

export default function Avatar({ name, role, headshotUrl, size = 40, fontSize = 14, radius = 10 }: AvatarProps) {
  const rm = roleMeta(role)
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: radius,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize, flexShrink: 0, overflow: 'hidden',
    backgroundSize: 'cover', backgroundPosition: 'center',
    ...(headshotUrl
      ? { backgroundImage: `url(${headshotUrl})` }
      : { background: rm.bg, color: rm.fg }),
  }
  return (
    <div style={style}>
      {!headshotUrl && <span>{initials(name)}</span>}
    </div>
  )
}
