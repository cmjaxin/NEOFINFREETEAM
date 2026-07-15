'use client'
import { useState } from 'react'

const C = {
  bg: '#F4F6F8', white: '#fff', navy: '#0A2540', border: '#E4E8EC',
  borderSoft: '#DCE1E6', text: '#26303B', muted: '#858889', dim: '#5C6570',
  accent: '#5BCBF5', green: '#16a34a', greenBg: 'rgba(34,197,94,0.08)',
  red: '#dc2626', amber: '#d97706', purple: '#7c3aed',
}

function fmtM(n: number) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n
}

// ── Monthly snapshot data (from YTD CSVs, Jan–Jul 2026) ──────────────────
interface MASnap { name: string; branch: string; families: number; volume: number; respa: number; initial: number }
interface MonthSnap {
  label: string
  teamFamilies: number; teamVolume: number; teamRespa: number; teamInitial: number
  mas: MASnap[]
}

const MONTHS: MonthSnap[] = [
  {
    label: 'January 2026', teamFamilies: 65, teamVolume: 28751068, teamRespa: 81, teamInitial: 394,
    mas: [
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 11, volume: 4686842, respa: 6,  initial: 15 },
      { name: 'Gregory Allen',      branch: 'Allen Branch',      families: 6,  volume: 1070876, respa: 5,  initial: 41 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 5,  volume: 2640796, respa: 6,  initial: 36 },
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 5,  volume: 2699708, respa: 7,  initial: 35 },
      { name: 'Drake Bloebaum',     branch: 'Mettle Branch',     families: 5,  volume: 1238182, respa: 8,  initial: 26 },
      { name: 'Michael Jones',      branch: 'Mettle Branch',     families: 4,  volume: 1946862, respa: 6,  initial: 39 },
      { name: 'Benjamin Kyle',      branch: 'Mettle Branch',     families: 4,  volume: 1765550, respa: 1,  initial: 16 },
      { name: 'Ross Zimmerman',     branch: 'Mettle Branch',     families: 4,  volume: 3224378, respa: 10, initial: 48 },
      { name: 'Scott DiGregorio',   branch: 'DiGregorio Branch', families: 3,  volume: 1000000, respa: 5,  initial: 11 },
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 3,  volume: 1190250, respa: 12, initial: 30 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 3,  volume: 2550334, respa: 3,  initial: 8  },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 2,  volume: 477350,  respa: 6,  initial: 18 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 2,  volume: 795000,  respa: 4,  initial: 13 },
      { name: 'Ryan Todey',         branch: 'Condie Branch',     families: 2,  volume: 1340611, respa: 1,  initial: 3  },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 1,  volume: 832750,  respa: 5,  initial: 28 },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 1,  volume: 308750,  respa: 3,  initial: 12 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 1,  volume: 158000,  respa: 5,  initial: 9  },
      { name: 'Bryon Wensel',       branch: 'Mettle Branch',     families: 1,  volume: 187986,  respa: 1,  initial: 0  },
      { name: 'Joel Davis',         branch: 'Solo',              families: 1,  volume: 346655,  respa: 0,  initial: 0  },
      { name: 'Matthew McNally',    branch: 'Mettle Branch',     families: 1,  volume: 289060,  respa: 0,  initial: 1  },
    ],
  },
  {
    label: 'February 2026', teamFamilies: 69, teamVolume: 26959697, teamRespa: 100, teamInitial: 475,
    mas: [
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 9,  volume: 5819496, respa: 6,  initial: 27 },
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 5,  volume: 2872015, respa: 4,  initial: 14 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 5,  volume: 3095608, respa: 5,  initial: 26 },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 5,  volume: 1336345, respa: 7,  initial: 41 },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 5,  volume: 1763950, respa: 9,  initial: 25 },
      { name: 'Scott DiGregorio',   branch: 'DiGregorio Branch', families: 5,  volume: 1260443, respa: 2,  initial: 10 },
      { name: 'Benjamin Kyle',      branch: 'Mettle Branch',     families: 4,  volume: 0,       respa: 1,  initial: 43 },
      { name: 'Michael Jones',      branch: 'Mettle Branch',     families: 4,  volume: 1465882, respa: 4,  initial: 32 },
      { name: 'Ross Zimmerman',     branch: 'Mettle Branch',     families: 2,  volume: 768000,  respa: 7,  initial: 32 },
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 5,  volume: 2526094, respa: 15, initial: 32 },
      { name: 'Gregory Allen',      branch: 'Allen Branch',      families: 5,  volume: 879683,  respa: 8,  initial: 66 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 3,  volume: 885653,  respa: 5,  initial: 12 },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 4,  volume: 425333,  respa: 5,  initial: 16 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 2,  volume: 348616,  respa: 5,  initial: 20 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 4,  volume: 1595012, respa: 2,  initial: 12 },
      { name: 'David Nelson',       branch: 'Mettle Branch',     families: 1,  volume: 400500,  respa: 2,  initial: 29 },
      { name: 'Michael Madonna',    branch: 'Solo',              families: 1,  volume: 130000,  respa: 2,  initial: 3  },
      { name: 'Ryan Todey',         branch: 'Condie Branch',     families: 1,  volume: 256575,  respa: 0,  initial: 0  },
    ],
  },
  {
    label: 'March 2026', teamFamilies: 96, teamVolume: 50440978, teamRespa: 113, teamInitial: 508,
    mas: [
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 16, volume: 12053658, respa: 8,  initial: 16 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 12, volume: 3359814,  respa: 4,  initial: 17 },
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 7,  volume: 5016537,  respa: 7,  initial: 20 },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 6,  volume: 3304868,  respa: 8,  initial: 62 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 6,  volume: 2637081,  respa: 7,  initial: 40 },
      { name: 'Ross Zimmerman',     branch: 'Mettle Branch',     families: 6,  volume: 2927940,  respa: 6,  initial: 26 },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 4,  volume: 2165373,  respa: 11, initial: 29 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 3,  volume: 2395342,  respa: 2,  initial: 8  },
      { name: 'Gregory Allen',      branch: 'Allen Branch',      families: 9,  volume: 2060016,  respa: 8,  initial: 45 },
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 5,  volume: 4168096,  respa: 11, initial: 22 },
      { name: 'David Nelson',       branch: 'Mettle Branch',     families: 2,  volume: 398940,   respa: 5,  initial: 54 },
      { name: 'Anthony Alfonso Soto',branch:'DiGregorio Branch', families: 1,  volume: 424000,   respa: 2,  initial: 4  },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 3,  volume: 1184679,  respa: 9,  initial: 31 },
      { name: 'Drake Bloebaum',     branch: 'Mettle Branch',     families: 6,  volume: 4279148,  respa: 8,  initial: 32 },
      { name: 'Benjamin Kyle',      branch: 'Mettle Branch',     families: 2,  volume: 928650,   respa: 1,  initial: 22 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 5,  volume: 1781326,  respa: 4,  initial: 18 },
      { name: 'Joshua Mettle',      branch: 'Mettle Branch',     families: 1,  volume: 400500,   respa: 0,  initial: 0  },
      { name: 'Michael Madonna',    branch: 'Solo',              families: 1,  volume: 644000,   respa: 0,  initial: 0  },
      { name: 'Torrence Williamson',branch: 'Solo',              families: 1,  volume: 310500,   respa: 1,  initial: 1  },
    ],
  },
  {
    label: 'April 2026', teamFamilies: 86, teamVolume: 46133997, teamRespa: 114, teamInitial: 61,
    mas: [
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 9,  volume: 6800626,  respa: 10, initial: 3 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 7,  volume: 4130460,  respa: 9,  initial: 3 },
      { name: 'Ross Zimmerman',     branch: 'Mettle Branch',     families: 7,  volume: 3678830,  respa: 9,  initial: 1 },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 6,  volume: 4362040,  respa: 7,  initial: 1 },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 5,  volume: 1372807,  respa: 6,  initial: 1 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 8,  volume: 4393457,  respa: 9,  initial: 3 },
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 7,  volume: 5666263,  respa: 6,  initial: 2 },
      { name: 'Scott DiGregorio',   branch: 'DiGregorio Branch', families: 5,  volume: 2494609,  respa: 4,  initial: 1 },
      { name: 'Drake Bloebaum',     branch: 'Mettle Branch',     families: 6,  volume: 3036050,  respa: 5,  initial: 1 },
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 4,  volume: 2183977,  respa: 9,  initial: 3 },
      { name: 'Gregory Allen',      branch: 'Allen Branch',      families: 6,  volume: 723084,   respa: 8,  initial: 4 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 0,  volume: 0,        respa: 6,  initial: 1 },
      { name: 'Michael Jones',      branch: 'Mettle Branch',     families: 1,  volume: 524400,   respa: 4,  initial: 1 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 3,  volume: 858925,   respa: 4,  initial: 1 },
      { name: 'David Nelson',       branch: 'Mettle Branch',     families: 3,  volume: 1915750,  respa: 2,  initial: 1 },
      { name: 'Anthony Alfonso Soto',branch:'DiGregorio Branch', families: 2,  volume: 519816,   respa: 1,  initial: 0 },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 6,  volume: 3045064,  respa: 8,  initial: 3 },
    ],
  },
  {
    label: 'May 2026', teamFamilies: 84, teamVolume: 44288979, teamRespa: 134, teamInitial: 22,
    mas: [
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 10, volume: 5526631, respa: 10, initial: 6 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 8,  volume: 4114987, respa: 5,  initial: 2 },
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 9,  volume: 6676691, respa: 7,  initial: 1 },
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 4,  volume: 5287250, respa: 6,  initial: 1 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 6,  volume: 2184064, respa: 8,  initial: 1 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 4,  volume: 1592704, respa: 4,  initial: 0 },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 4,  volume: 1632155, respa: 8,  initial: 0 },
      { name: 'Gregory Allen',      branch: 'Allen Branch',      families: 4,  volume: 760147,  respa: 18, initial: 2 },
      { name: 'Drake Bloebaum',     branch: 'Mettle Branch',     families: 4,  volume: 1511050, respa: 10, initial: 1 },
      { name: 'Benjamin Kyle',      branch: 'Mettle Branch',     families: 4,  volume: 2772050, respa: 7,  initial: 0 },
      { name: 'Ross Zimmerman',     branch: 'Mettle Branch',     families: 4,  volume: 2810661, respa: 13, initial: 2 },
      { name: 'Ashley Roberts',     branch: 'Thomas Branch',     families: 1,  volume: 236000,  respa: 3,  initial: 0 },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 3,  volume: 774790,  respa: 3,  initial: 0 },
      { name: 'Scott DiGregorio',   branch: 'DiGregorio Branch', families: 4,  volume: 1601500, respa: 4,  initial: 0 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 4,  volume: 1971751, respa: 6,  initial: 0 },
      { name: 'David Nelson',       branch: 'Mettle Branch',     families: 4,  volume: 477379,  respa: 3,  initial: 0 },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 3,  volume: 2299950, respa: 2,  initial: 0 },
      { name: 'Anthony Alfonso Soto',branch:'DiGregorio Branch', families: 1,  volume: 282987,  respa: 1,  initial: 0 },
      { name: 'Bryon Wensel',       branch: 'Mettle Branch',     families: 1,  volume: 300000,  respa: 0,  initial: 0 },
      { name: 'Ashley Roberts',     branch: 'Thomas Branch',     families: 1,  volume: 236000,  respa: 3,  initial: 0 },
    ],
  },
  {
    label: 'June 2026', teamFamilies: 96, teamVolume: 46102129, teamRespa: 96, teamInitial: 14,
    mas: [
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 13, volume: 8167395, respa: 15, initial: 4 },
      { name: 'Drake Bloebaum',     branch: 'Mettle Branch',     families: 10, volume: 5734309, respa: 12, initial: 2 },
      { name: 'Ross Zimmerman',     branch: 'Mettle Branch',     families: 9,  volume: 3354753, respa: 6,  initial: 1 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 9,  volume: 4316391, respa: 4,  initial: 2 },
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 8,  volume: 5071814, respa: 6,  initial: 1 },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 3,  volume: 838000,  respa: 16, initial: 4 },
      { name: 'Scott DiGregorio',   branch: 'DiGregorio Branch', families: 5,  volume: 4185174, respa: 2,  initial: 0 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 5,  volume: 2929000, respa: 3,  initial: 1 },
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 4,  volume: 1874296, respa: 7,  initial: 1 },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 4,  volume: 1722600, respa: 3,  initial: 1 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 4,  volume: 1881290, respa: 5,  initial: 0 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 3,  volume: 1121743, respa: 1,  initial: 0 },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 2,  volume: 950763,  respa: 6,  initial: 0 },
      { name: 'Benjamin Kyle',      branch: 'Mettle Branch',     families: 3,  volume: 949643,  respa: 2,  initial: 0 },
      { name: 'Ashley Roberts',     branch: 'Thomas Branch',     families: 1,  volume: 375000,  respa: 3,  initial: 0 },
      { name: 'Gregory Allen',      branch: 'Allen Branch',      families: 7,  volume: 1025670, respa: 11, initial: 1 },
      { name: 'Michael Jones',      branch: 'Mettle Branch',     families: 4,  volume: 1329091, respa: 1,  initial: 0 },
      { name: 'Joshua Mettle',      branch: 'Mettle Branch',     families: 0,  volume: 0,       respa: 2,  initial: 0 },
      { name: 'Julie Jolivet',      branch: 'Solo',              families: 1,  volume: 193652,  respa: 0,  initial: 0 },
      { name: 'Michael Madonna',    branch: 'Solo',              families: 1,  volume: 74955,   respa: 2,  initial: 1 },
    ],
  },
  {
    label: 'July 2026', teamFamilies: 36, teamVolume: 22005311, teamRespa: 38, teamInitial: 1,
    mas: [
      { name: 'Justin Padron',      branch: 'Padron Branch',     families: 4,  volume: 5330920, respa: 4,  initial: 0 },
      { name: 'Jason Drobeck',      branch: 'Drobeck Branch',    families: 5,  volume: 3184485, respa: 4,  initial: 0 },
      { name: 'Katrinka Condie',    branch: 'Condie Branch',     families: 3,  volume: 4043186, respa: 5,  initial: 0 },
      { name: 'Skyler Ford',        branch: 'Mettle Branch',     families: 3,  volume: 1312115, respa: 5,  initial: 0 },
      { name: 'Michael Breen',      branch: 'Mettle Branch',     families: 2,  volume: 1700000, respa: 0,  initial: 0 },
      { name: 'Aaron Thomas',       branch: 'Thomas Branch',     families: 4,  volume: 1681465, respa: 0,  initial: 0 },
      { name: 'Kaytlin Collins',    branch: 'Thomas Branch',     families: 3,  volume: 528137,  respa: 3,  initial: 0 },
      { name: 'Ashley Roberts',     branch: 'Thomas Branch',     families: 2,  volume: 873573,  respa: 0,  initial: 0 },
      { name: 'Anthony Alfonso Soto',branch:'DiGregorio Branch', families: 1,  volume: 248500,  respa: 0,  initial: 0 },
      { name: 'David Nelson',       branch: 'Mettle Branch',     families: 1,  volume: 536250,  respa: 2,  initial: 0 },
      { name: 'Edgardo Balentine',  branch: 'DiGregorio Branch', families: 1,  volume: 219741,  respa: 8,  initial: 0 },
      { name: 'Jacky Vuong',        branch: 'Solo',              families: 2,  volume: 666000,  respa: 0,  initial: 0 },
      { name: 'Joshua Mettle',      branch: 'Mettle Branch',     families: 1,  volume: 500000,  respa: 0,  initial: 0 },
      { name: 'Matthew Smith',      branch: 'Mettle Branch',     families: 0,  volume: 0,       respa: 1,  initial: 1 },
      { name: 'Michael Jones',      branch: 'Mettle Branch',     families: 0,  volume: 0,       respa: 3,  initial: 0 },
      { name: 'Michael Madonna',    branch: 'Solo',              families: 0,  volume: 0,       respa: 3,  initial: 0 },
      { name: 'Bryon Wensel',       branch: 'Mettle Branch',     families: 0,  volume: 0,       respa: 1,  initial: 0 },
    ],
  },
]

// ── Branch colors ─────────────────────────────────────────────────────────
const BRANCH_COLORS: Record<string, string> = {
  'Mettle Branch': '#5BCBF5', 'Condie Branch': '#f472b6', 'Drobeck Branch': '#f59e0b',
  'Thomas Branch': '#34d399', 'Allen Branch': '#a78bfa', 'DiGregorio Branch': '#fb923c',
  'Padron Branch': '#06b6d4', 'Solo': '#94a3b8',
}

// ── Month pick messages ───────────────────────────────────────────────────
const HERO_MESSAGES: Record<string, string> = {
  'January 2026': 'Kicking off 2026 strong!',
  'February 2026': 'Love what you do and the results show!',
  'March 2026': 'Best month yet — the team is on fire!',
  'April 2026': 'April brought incredible energy across the division.',
  'May 2026': 'Momentum is everything — and the team has it.',
  'June 2026': 'Summer heat is on and so is this team!',
  'July 2026': 'Mid-year check-in — we\'re building something special.',
}

// ── Auto milestones ───────────────────────────────────────────────────────
function buildMilestones(snap: MonthSnap, idx: number): string[] {
  const ms: string[] = []
  const sorted = [...snap.mas].filter(m => m.families > 0).sort((a, b) => b.families - a.families)
  if (sorted.length > 0) ms.push(`🏆 ${sorted[0].name} led the team with ${sorted[0].families} families funded`)
  if (sorted.length > 1) ms.push(`⭐ ${sorted[1].name} followed with ${sorted[1].families} families funded`)
  const byVol = [...snap.mas].filter(m => m.volume > 0).sort((a, b) => b.volume - a.volume)
  if (byVol.length > 0 && byVol[0].name !== sorted[0]?.name) {
    ms.push(`💰 ${byVol[0].name} led in volume at ${fmtM(byVol[0].volume)}`)
  }
  if (snap.teamFamilies > 90) ms.push(`🎉 The team surpassed 90 families in a single month — incredible milestone!`)
  const debutants = snap.mas.filter(m => {
    if (m.families === 0) return false
    // If this is their first appearance (no families in earlier months)
    return MONTHS.slice(0, idx).every(prev => !prev.mas.find(pm => pm.name === m.name && pm.families > 0))
  })
  for (const d of debutants) ms.push(`🌟 First closing of 2026 for ${d.name} — welcome to the board!`)
  if (snap.teamRespa > 100) ms.push(`📋 Team submitted over 100 RESPA applications — pipeline is full!`)
  return ms
}

// ── Manual highlights stored in state ─────────────────────────────────────
interface Highlight { id: string; text: string; author: string }

// ── Components ─────────────────────────────────────────────────────────────
function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px', position: 'relative', overflow: 'hidden', flex: 1, minWidth: 160 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 28, color: C.navy, lineHeight: 1 }}>{value}</div>
    </div>
  )
}

function TopCard({ rank, name, branch, families, volume }: { rank: number; name: string; branch: string; families: number; volume: number }) {
  const medals = ['🥇', '🥈', '🥉']
  const bcolor = BRANCH_COLORS[branch] ?? C.muted
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{medals[rank]}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: bcolor, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.muted }}>{branch}</div>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.navy, fontFamily: 'Consolas,monospace' }}>{families} fam</div>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: 'Consolas,monospace' }}>{fmtM(volume)}</div>
      </div>
    </div>
  )
}

export default function Wins() {
  const [monthIdx, setMonthIdx] = useState(MONTHS.length - 1)
  const [highlights, setHighlights] = useState<Record<number, Highlight[]>>({})
  const [newText, setNewText] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [adding, setAdding] = useState(false)

  const snap = MONTHS[monthIdx]
  const milestones = buildMilestones(snap, monthIdx)
  const topByFam = [...snap.mas].filter(m => m.families > 0).sort((a, b) => b.families - a.families).slice(0, 3)
  const topByVol = [...snap.mas].filter(m => m.volume > 0).sort((a, b) => b.volume - a.volume).slice(0, 3)
  const monthHighlights = highlights[monthIdx] ?? []

  // Branch totals for this month
  const branchMap = new Map<string, { families: number; volume: number; respa: number }>()
  for (const ma of snap.mas) {
    const b = branchMap.get(ma.branch) ?? { families: 0, volume: 0, respa: 0 }
    b.families += ma.families; b.volume += ma.volume; b.respa += ma.respa
    branchMap.set(ma.branch, b)
  }
  const branchRows = [...branchMap.entries()].filter(([, v]) => v.families > 0 || v.respa > 0).sort((a, b) => b[1].families - a[1].families)

  function addHighlight() {
    if (!newText.trim()) return
    const h: Highlight = { id: Date.now().toString(), text: newText.trim(), author: newAuthor.trim() || 'Team' }
    setHighlights(prev => ({ ...prev, [monthIdx]: [...(prev[monthIdx] ?? []), h] }))
    setNewText(''); setNewAuthor(''); setAdding(false)
  }
  function removeHighlight(id: string) {
    setHighlights(prev => ({ ...prev, [monthIdx]: (prev[monthIdx] ?? []).filter(h => h.id !== id) }))
  }

  const heroMsg = HERO_MESSAGES[snap.label] ?? 'The team delivered again.'

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '36px 40px 90px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-.02em', fontSize: 32, margin: 0, color: C.navy }}>Monthly Wins</h1>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 5 }}>FinFree Division · Team highlights and monthly recaps</div>
      </div>

      {/* Month tabs */}
      <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 28, gap: 0, overflowX: 'auto' }}>
        {MONTHS.map((m, i) => {
          const shortLabel = m.label.split(' ')[0]
          const isActive = i === monthIdx
          return (
            <button key={i} onClick={() => setMonthIdx(i)} style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'none', color: isActive ? C.navy : C.muted, borderBottom: `2px solid ${isActive ? C.accent : 'transparent'}`, marginBottom: -2, transition: 'color .12s', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {shortLabel}
              {i === MONTHS.length - 1 && <span style={{ marginLeft: 5, fontSize: 10, background: C.accent, color: C.navy, borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>LATEST</span>}
            </button>
          )
        })}
      </div>

      {/* Hero banner */}
      <div style={{ borderRadius: 18, background: `linear-gradient(135deg, ${C.navy} 0%, #1a3a5c 60%, #0e4a6e 100%)`, padding: '32px 36px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        {/* decorative dots */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', width: 6 + (i % 3) * 4, height: 6 + (i % 3) * 4, borderRadius: '50%', background: ['#5BCBF5', '#f472b6', '#f59e0b', '#34d399', '#a78bfa'][i % 5], opacity: 0.25, top: `${10 + (i * 7) % 70}%`, left: `${(i * 9) % 95}%` }} />
        ))}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 10, fontWeight: 600 }}>{snap.label} · Team Recap</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 6, letterSpacing: '-.01em' }}>{heroMsg}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
            {snap.teamFamilies} families funded · {fmtM(snap.teamVolume)} · {snap.teamRespa} RESPA apps
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <StatTile label="Families Funded" value={String(snap.teamFamilies)} accent={C.accent} />
        <StatTile label="Total Volume" value={fmtM(snap.teamVolume)} accent={C.accent} />
        <StatTile label="RESPA Apps" value={String(snap.teamRespa)} accent="#a78bfa" />
        <StatTile label="Initial Apps" value={String(snap.teamInitial)} accent="#f0b429" />
      </div>

      {/* Top performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 12 }}>Top Producers — Families</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topByFam.map((ma, i) => <TopCard key={ma.name} rank={i} name={ma.name} branch={ma.branch} families={ma.families} volume={ma.volume} />)}
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 12 }}>Top Producers — Volume</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topByVol.map((ma, i) => <TopCard key={ma.name} rank={i} name={ma.name} branch={ma.branch} families={ma.families} volume={ma.volume} />)}
          </div>
        </div>
      </div>

      {/* Branch breakdown */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, color: C.navy }}>Branch Breakdown</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Branch', 'Families', 'Volume', 'RESPA Apps'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, padding: '9px 16px', textAlign: i === 0 ? 'left' : 'right', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branchRows.map(([bname, btot], i) => {
                const bcolor = BRANCH_COLORS[bname] ?? C.muted
                return (
                  <tr key={bname} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#FAFBFC' : C.white }}>
                    <td style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 28, background: bcolor, borderRadius: 2, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: C.navy, fontSize: 13 }}>{bname}</span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, fontWeight: 700, color: C.navy }}>{btot.families}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, color: C.dim }}>{fmtM(btot.volume)}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, color: C.dim }}>{btot.respa}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full MA table */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: 14, color: C.navy }}>Individual Results</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Mortgage Advisor', 'Branch', 'Families', 'Volume', 'RESPA', 'Initial'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted, padding: '9px 14px', textAlign: i <= 1 ? 'left' : 'right', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...snap.mas].sort((a, b) => b.families - a.families || b.volume - a.volume).map((ma, i) => {
                const bcolor = BRANCH_COLORS[ma.branch] ?? C.muted
                return (
                  <tr key={ma.name + i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 1 ? '#FAFBFC' : C.white }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: 13, color: C.navy }}>{ma.name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: bcolor, display: 'inline-block', flexShrink: 0 }} />{ma.branch}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, fontWeight: ma.families > 0 ? 700 : 400, color: ma.families > 0 ? C.navy : C.muted }}>{ma.families || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, color: C.dim }}>{ma.volume > 0 ? fmtM(ma.volume) : '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, color: C.dim }}>{ma.respa || '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'Consolas,monospace', fontSize: 13, color: C.dim }}>{ma.initial || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto milestones */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 14 }}>Highlights & Milestones</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: C.bg, borderRadius: 9, fontSize: 13, color: C.text }}>{m}</div>
          ))}
        </div>
      </div>

      {/* Custom highlights */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>Team Notes</div>
          <button onClick={() => setAdding(a => !a)} style={{ padding: '6px 14px', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {adding ? 'Cancel' : '+ Add Note'}
          </button>
        </div>

        {adding && (
          <div style={{ background: C.bg, border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <textarea value={newText} onChange={e => setNewText(e.target.value)} placeholder="Describe the win, recognition, or note for this month…" rows={3}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.borderSoft}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.white, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Your name (optional)"
                style={{ flex: 1, padding: '8px 12px', border: `1px solid ${C.borderSoft}`, borderRadius: 8, fontSize: 13, color: C.text, background: C.white }} />
              <button onClick={addHighlight} disabled={!newText.trim()}
                style={{ padding: '8px 20px', background: newText.trim() ? C.accent : C.bg, color: newText.trim() ? C.navy : C.muted, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: newText.trim() ? 'pointer' : 'default' }}>
                Save Note
              </button>
            </div>
          </div>
        )}

        {monthHighlights.length === 0 && !adding && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>
            No team notes yet for {snap.label}. Add one to celebrate the wins!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {monthHighlights.map(h => (
            <div key={h.id} style={{ padding: '12px 14px', background: C.greenBg, border: `1px solid rgba(34,197,94,0.2)`, borderRadius: 9, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{h.text}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>— {h.author}</div>
              </div>
              <button onClick={() => removeHighlight(h.id)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16, flexShrink: 0, padding: 2, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
