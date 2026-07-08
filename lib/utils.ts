import { OnboardingRole } from './types'

export function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function fmtDate(v: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!v) return ''
  let d: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, dd] = v.split('-').map(Number)
    d = new Date(y, m - 1, dd)
  } else {
    d = new Date(v)
  }
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric' })
}

export function dayInfo(v: string | null | undefined): { diff: number; label: string } {
  if (!v) return { diff: -99999, label: 'No start date' }
  const [y, m, dd] = v.split('-').map(Number)
  const s = new Date(y, m - 1, dd)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const diff = Math.round((t.getTime() - s.getTime()) / 86400000)
  let label: string
  if (diff < 0) label = `Starts in ${-diff}d`
  else if (diff === 0) label = 'Starts today'
  else label = `${diff}d in`
  return { diff, label }
}

export function roleMeta(role: OnboardingRole) {
  return ({
    MA: { label: 'MA', bg: '#E2F3FB', fg: '#1B6E90' },
    LSCA: { label: 'LS/CA', bg: '#E8ECF1', fg: '#334B67' },
    PP: { label: 'PP', bg: '#E5F1EA', fg: '#2E6B49' },
  })[role] ?? { label: role, bg: '#EEF1F4', fg: '#5F6B76' }
}

export function statusPillMeta(status: string) {
  return ({
    onboarding: { label: 'Onboarding', bg: '#E2F3FB', fg: '#1B6E90' },
    active: { label: 'Active', bg: '#E5F1EA', fg: '#2E6B49' },
    terminated: { label: 'Terminated', bg: '#F0ECEC', fg: '#9A5A54' },
  })[status] ?? { label: status, bg: '#EEF1F4', fg: '#5F6B76' }
}

export function progressMeta(done: number, total: number) {
  if (total && done === total) return { label: 'Complete', bg: '#E5F1EA', fg: '#2E6B49' }
  if (done === 0) return { label: 'Not started', bg: '#EEF1F4', fg: '#7A8087' }
  return { label: 'In progress', bg: '#FBF1DE', fg: '#9A6B1E' }
}

export function avatarBg(role: OnboardingRole) {
  return roleMeta(role)
}
