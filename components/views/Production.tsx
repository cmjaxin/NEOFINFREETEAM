'use client'
import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6F8', white: '#fff', navy: '#0A2540', border: '#E4E8EC',
  borderSoft: '#DCE1E6', text: '#26303B', muted: '#858889', dim: '#5C6570',
  accent: '#5BCBF5', green: '#16a34a', greenBg: 'rgba(34,197,94,0.08)',
  red: '#dc2626', amber: '#d97706'
}

// ─── Branch config ────────────────────────────────────────────────────────────
const BRANCH_CONFIG = [
  { name: 'Mettle Branch',     color: '#5BCBF5', members: ['Joshua Mettle','Matthew Smith','Benjamin Kyle','Skyler Ford','Drake Bloebaum','Ross Zimmerman','Michael Breen','Michael Jones','David Nelson','Bryon Wensel','Matthew McNally','Bryson Wensel'] },
  { name: 'Condie Branch',     color: '#f472b6', members: ['Katrinka Condie','Ryan Todey'] },
  { name: 'Drobeck Branch',    color: '#f59e0b', members: ['Jason Drobeck'] },
  { name: 'Thomas Branch',     color: '#34d399', members: ['Aaron Thomas','Kaytlin Collins','Ashley Roberts'] },
  { name: 'Allen Branch',      color: '#a78bfa', members: ['Gregory Allen','Greg Allen'] },
  { name: 'DiGregorio Branch', color: '#fb923c', members: ['Scott DiGregorio','Edgardo Balentine','Anthony Alfonso Soto','Anthony Soto','Scott Degregorio'] },
  { name: 'Padron Branch',    color: '#06b6d4', members: ['Justin Padron'] },
]

// ─── Types ────────────────────────────────────────────────────────────────────
interface MARecord {
  name: string
  ytdFamilies: number; ytdVolume: number; ytdRespaApps: number; ytdInitialApps: number
  monthlyFamilies: number[]
  monthlyVolume: number[]
  monthlyRespaApps: number[]
  monthlyInitialApps: number[]
}

interface WeeklyRow {
  weekLabel: string
  families: number
  volume: number
  respaApps: number
  initialApps: number
}

interface BranchGroup {
  name: string
  color: string
  isSolo: boolean
  members: MARecord[]
}

type PeriodStr = 'ytd'|'range'|'0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'

// ─── Seed MA data ─────────────────────────────────────────────────────────────
const SEED_MA: MARecord[] = [
  { name:'Katrinka Condie',    ytdFamilies:58, ytdVolume:41832995, ytdRespaApps:63,  ytdInitialApps:90,  monthlyFamilies:[5,5,16,7,9,13,3,0,0,0,0,0],  monthlyVolume:[2699708,2526094,12053658,5666263,6676691,8167395,4043186,0,0,0,0,0], monthlyRespaApps:[7,15,8,6,7,15,5,0,0,0,0,0],  monthlyInitialApps:[35,32,16,2,1,4,0,0,0,0,0,0] },
  { name:'Justin Padron',      ytdFamilies:52, ytdVolume:34456944, ytdRespaApps:51,  ytdInitialApps:61,  monthlyFamilies:[11,5,5,9,10,8,4,0,0,0,0,0],  monthlyVolume:[4686842,2872015,4168096,6800626,5526631,5071814,5330920,0,0,0,0,0], monthlyRespaApps:[6,4,11,10,10,6,4,0,0,0,0,0], monthlyInitialApps:[15,14,22,3,6,1,0,0,0,0,0,0] },
  { name:'Skyler Ford',        ytdFamilies:42, ytdVolume:20579512, ytdRespaApps:44,  ytdInitialApps:108, monthlyFamilies:[5,5,6,8,6,9,3,0,0,0,0,0],   monthlyVolume:[2640796,3095608,2637081,4393457,2184064,4316391,1312115,0,0,0,0,0], monthlyRespaApps:[6,5,7,9,8,4,5,0,0,0,0,0],   monthlyInitialApps:[36,26,40,3,1,2,0,0,0,0,0,0] },
  { name:'Jacky Vuong',        ytdFamilies:40, ytdVolume:18636248, ytdRespaApps:29,  ytdInitialApps:43,  monthlyFamilies:[3,3,12,7,8,5,2,0,0,0,0,0],  monthlyVolume:[2550334,885653,3359814,4130460,4114987,2929000,666000,0,0,0,0,0],  monthlyRespaApps:[3,5,4,9,5,3,0,0,0,0,0,0],   monthlyInitialApps:[8,12,17,3,2,1,0,0,0,0,0,0] },
  { name:'Gregory Allen',      ytdFamilies:38, ytdVolume:6629447,  ytdRespaApps:61,  ytdInitialApps:159, monthlyFamilies:[6,5,9,6,4,7,1,0,0,0,0,0],   monthlyVolume:[1070876,879683,2060016,723084,760147,1025670,109971,0,0,0,0,0],  monthlyRespaApps:[5,8,8,8,18,11,3,0,0,0,0,0],  monthlyInitialApps:[41,66,45,4,2,1,0,0,0,0,0,0] },
  { name:'Jason Drobeck',      ytdFamilies:36, ytdVolume:24556291, ytdRespaApps:51,  ytdInitialApps:82,  monthlyFamilies:[3,9,7,4,4,4,5,0,0,0,0,0],   monthlyVolume:[1190250,5819496,5016537,2183977,5287250,1874296,3184485,0,0,0,0,0], monthlyRespaApps:[12,6,7,9,6,7,4,0,0,0,0,0],  monthlyInitialApps:[30,27,20,3,1,1,0,0,0,0,0,0] },
  { name:'Drake Bloebaum',     ytdFamilies:36, ytdVolume:17801759, ytdRespaApps:56,  ytdInitialApps:101, monthlyFamilies:[5,3,6,6,4,10,2,0,0,0,0,0],  monthlyVolume:[1238182,1129020,4279148,3036050,1511050,5734309,874000,0,0,0,0,0], monthlyRespaApps:[8,8,8,5,10,12,5,0,0,0,0,0],  monthlyInitialApps:[26,38,32,1,1,2,1,0,0,0,0,0] },
  { name:'Matthew Smith',      ytdFamilies:23, ytdVolume:11769740, ytdRespaApps:37,  ytdInitialApps:135, monthlyFamilies:[1,5,6,6,3,2,0,0,0,0,0,0],   monthlyVolume:[832750,1336345,3304868,3045064,2299950,950763,0,0,0,0,0,0],    monthlyRespaApps:[5,7,8,8,2,6,1,0,0,0,0,0],   monthlyInitialApps:[28,41,62,3,0,0,1,0,0,0,0,0] },
  { name:'Ross Zimmerman',     ytdFamilies:33, ytdVolume:16957257, ytdRespaApps:57,  ytdInitialApps:113, monthlyFamilies:[4,2,6,7,4,9,1,0,0,0,0,0],   monthlyVolume:[3224378,768000,2927940,3678830,2810661,3354753,192695,0,0,0,0,0], monthlyRespaApps:[10,7,6,9,13,6,6,0,0,0,0,0],  monthlyInitialApps:[48,32,26,1,2,1,3,0,0,0,0,0] },
  { name:'Aaron Thomas',       ytdFamilies:29, ytdVolume:13804933, ytdRespaApps:44,  ytdInitialApps:74,  monthlyFamilies:[2,5,4,6,4,4,4,0,0,0,0,0],   monthlyVolume:[477350,1763950,2165373,4362040,1632155,1722600,1681465,0,0,0,0,0], monthlyRespaApps:[6,9,11,7,8,3,0,0,0,0,0,0],   monthlyInitialApps:[18,25,29,1,0,1,0,0,0,0,0,0] },
  { name:'Kaytlin Collins',    ytdFamilies:22, ytdVolume:5432496,  ytdRespaApps:45,  ytdInitialApps:64,  monthlyFamilies:[1,4,3,5,3,3,3,0,0,0,0,0],   monthlyVolume:[308750,425333,1184679,1372807,774790,838000,528137,0,0,0,0,0],  monthlyRespaApps:[3,5,9,6,3,16,3,0,0,0,0,0],   monthlyInitialApps:[12,16,31,1,0,4,0,0,0,0,0,0] },
  { name:'Scott DiGregorio',   ytdFamilies:22, ytdVolume:10541726, ytdRespaApps:22,  ytdInitialApps:34,  monthlyFamilies:[3,5,0,5,4,5,0,0,0,0,0,0],   monthlyVolume:[1000000,1260443,0,2494609,1601500,4185174,0,0,0,0,0,0],      monthlyRespaApps:[5,2,3,4,4,2,2,0,0,0,0,0],   monthlyInitialApps:[11,10,12,1,0,0,0,0,0,0,0,0] },
  { name:'Edgardo Balentine',  ytdFamilies:21, ytdVolume:7856649,  ytdRespaApps:36,  ytdInitialApps:52,  monthlyFamilies:[2,2,5,3,4,4,1,0,0,0,0,0],   monthlyVolume:[795000,348616,1781326,858925,1971751,1881290,219741,0,0,0,0,0], monthlyRespaApps:[4,5,4,4,6,5,8,0,0,0,0,0],   monthlyInitialApps:[13,20,18,1,0,0,0,0,0,0,0,0] },
  { name:'Michael Breen',      ytdFamilies:17, ytdVolume:8562801,  ytdRespaApps:20,  ytdInitialApps:30,  monthlyFamilies:[1,4,3,0,4,3,2,0,0,0,0,0],   monthlyVolume:[158000,1595012,2395342,0,1592704,1121743,1700000,0,0,0,0,0],  monthlyRespaApps:[5,2,2,6,4,1,0,0,0,0,0,0],   monthlyInitialApps:[9,12,8,1,0,0,0,0,0,0,0,0] },
  { name:'Michael Jones',      ytdFamilies:15, ytdVolume:6748235,  ytdRespaApps:29,  ytdInitialApps:134, monthlyFamilies:[4,4,0,1,2,4,0,0,0,0,0,0],   monthlyVolume:[1946862,1465882,0,524400,1482000,1329091,0,0,0,0,0,0],      monthlyRespaApps:[6,4,6,4,5,1,3,0,0,0,0,0],   monthlyInitialApps:[39,32,61,1,1,0,0,0,0,0,0,0] },
  { name:'Benjamin Kyle',      ytdFamilies:13, ytdVolume:6415893,  ytdRespaApps:15,  ytdInitialApps:83,  monthlyFamilies:[4,0,2,0,4,3,0,0,0,0,0,0],   monthlyVolume:[1765550,0,928650,0,2772050,949643,0,0,0,0,0,0],            monthlyRespaApps:[1,1,1,3,7,2,0,0,0,0,0,0],   monthlyInitialApps:[16,43,22,2,0,0,0,0,0,0,0,0] },
  { name:'David Nelson',       ytdFamilies:11, ytdVolume:3728819,  ytdRespaApps:17,  ytdInitialApps:116, monthlyFamilies:[0,1,2,3,4,0,1,0,0,0,0,0],   monthlyVolume:[0,400500,398940,1915750,477379,0,536250,0,0,0,0,0],        monthlyRespaApps:[1,2,5,2,3,2,2,0,0,0,0,0],   monthlyInitialApps:[32,29,54,1,0,0,0,0,0,0,0,0] },
  { name:'Anthony Alfonso Soto',ytdFamilies:5, ytdVolume:1475303,  ytdRespaApps:7,   ytdInitialApps:9,   monthlyFamilies:[0,0,1,2,1,0,1,0,0,0,0,0],   monthlyVolume:[0,0,424000,519816,282987,0,248500,0,0,0,0,0],              monthlyRespaApps:[1,0,2,1,1,2,0,0,0,0,0,0],   monthlyInitialApps:[3,2,4,0,0,0,0,0,0,0,0,0] },
  { name:'Ashley Roberts',     ytdFamilies:5,  ytdVolume:1907773,  ytdRespaApps:9,   ytdInitialApps:6,   monthlyFamilies:[0,0,0,1,1,1,2,0,0,0,0,0],   monthlyVolume:[0,0,0,423200,236000,375000,873573,0,0,0,0,0],              monthlyRespaApps:[0,0,1,2,3,3,0,0,0,0,0,0],   monthlyInitialApps:[0,3,3,0,0,0,0,0,0,0,0,0] },
  { name:'Ryan Todey',         ytdFamilies:3,  ytdVolume:1597186,  ytdRespaApps:1,   ytdInitialApps:3,   monthlyFamilies:[2,1,0,0,0,0,0,0,0,0,0,0],   monthlyVolume:[1340611,256575,0,0,0,0,0,0,0,0,0,0],                       monthlyRespaApps:[1,0,0,0,0,0,0,0,0,0,0,0],   monthlyInitialApps:[3,0,0,0,0,0,0,0,0,0,0,0] },
  { name:'Michael Madonna',    ytdFamilies:3,  ytdVolume:848955,   ytdRespaApps:8,   ytdInitialApps:11,  monthlyFamilies:[0,1,1,0,0,1,0,0,0,0,0,0],   monthlyVolume:[0,130000,644000,0,0,74955,0,0,0,0,0,0],                    monthlyRespaApps:[1,2,0,0,0,2,3,0,0,0,0,0],   monthlyInitialApps:[7,3,0,0,0,1,0,0,0,0,0,0] },
  { name:'Bryon Wensel',       ytdFamilies:2,  ytdVolume:487986,   ytdRespaApps:3,   ytdInitialApps:7,   monthlyFamilies:[1,0,0,0,1,0,0,0,0,0,0,0],   monthlyVolume:[187986,0,0,0,300000,0,0,0,0,0,0,0],                        monthlyRespaApps:[1,0,0,1,0,0,1,0,0,0,0,0],   monthlyInitialApps:[0,1,6,0,0,0,0,0,0,0,0,0] },
  { name:'Joshua Mettle',      ytdFamilies:2,  ytdVolume:900500,   ytdRespaApps:3,   ytdInitialApps:3,   monthlyFamilies:[0,0,1,0,0,0,1,0,0,0,0,0],   monthlyVolume:[0,0,400500,0,0,0,500000,0,0,0,0,0],                        monthlyRespaApps:[0,1,0,0,0,2,0,0,0,0,0,0],   monthlyInitialApps:[0,3,0,0,0,0,0,0,0,0,0,0] },
  { name:'Julie Jolivet',      ytdFamilies:1,  ytdVolume:193652,   ytdRespaApps:1,   ytdInitialApps:0,   monthlyFamilies:[0,0,0,0,0,1,0,0,0,0,0,0],   monthlyVolume:[0,0,0,0,0,193652,0,0,0,0,0,0],                             monthlyRespaApps:[0,0,0,1,0,0,0,0,0,0,0,0],   monthlyInitialApps:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { name:'Joel Davis',         ytdFamilies:1,  ytdVolume:346655,   ytdRespaApps:0,   ytdInitialApps:0,   monthlyFamilies:[1,0,0,0,0,0,0,0,0,0,0,0],   monthlyVolume:[346655,0,0,0,0,0,0,0,0,0,0,0],                             monthlyRespaApps:[0,0,0,0,0,0,0,0,0,0,0,0],   monthlyInitialApps:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { name:'Matthew McNally',    ytdFamilies:1,  ytdVolume:289060,   ytdRespaApps:0,   ytdInitialApps:4,   monthlyFamilies:[1,0,0,0,0,0,0,0,0,0,0,0],   monthlyVolume:[289060,0,0,0,0,0,0,0,0,0,0,0],                             monthlyRespaApps:[0,0,0,0,0,0,0,0,0,0,0,0],   monthlyInitialApps:[1,1,2,0,0,0,0,0,0,0,0,0] },
  { name:'Torrence Williamson',ytdFamilies:1,  ytdVolume:310500,   ytdRespaApps:1,   ytdInitialApps:11,  monthlyFamilies:[0,0,1,0,0,0,0,0,0,0,0,0],   monthlyVolume:[0,0,310500,0,0,0,0,0,0,0,0,0],                             monthlyRespaApps:[0,0,1,0,0,0,0,0,0,0,0,0],   monthlyInitialApps:[6,4,1,0,0,0,0,0,0,0,0,0] },
  { name:'Valerie Miller',     ytdFamilies:0,  ytdVolume:0,        ytdRespaApps:5,   ytdInitialApps:0,   monthlyFamilies:[0,0,0,0,0,0,0,0,0,0,0,0],   monthlyVolume:[0,0,0,0,0,0,0,0,0,0,0,0],                                  monthlyRespaApps:[0,0,0,0,2,3,0,0,0,0,0,0],   monthlyInitialApps:[0,0,0,0,0,0,0,0,0,0,0,0] },
]

const SEED_WEEKLY: WeeklyRow[] = [
  { weekLabel: 'May 5',  families: 12, volume: 5200000, respaApps: 18, initialApps: 22 },
  { weekLabel: 'May 12', families: 15, volume: 7100000, respaApps: 21, initialApps: 19 },
  { weekLabel: 'May 19', families: 11, volume: 4900000, respaApps: 16, initialApps: 25 },
  { weekLabel: 'May 26', families: 14, volume: 6300000, respaApps: 19, initialApps: 18 },
  { weekLabel: 'Jun 2',  families: 17, volume: 8200000, respaApps: 24, initialApps: 20 },
  { weekLabel: 'Jun 9',  families: 13, volume: 5700000, respaApps: 20, initialApps: 17 },
  { weekLabel: 'Jun 16', families: 18, volume: 9100000, respaApps: 22, initialApps: 23 },
  { weekLabel: 'Jun 23', families: 10, volume: 4400000, respaApps: 15, initialApps: 14 },
  { weekLabel: 'Jun 30', families: 16, volume: 7600000, respaApps: 18, initialApps: 21 },
]

// ─── Utility functions ────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, '').trim()
}

function nameSimilar(a: string, b: string): boolean {
  const na = normName(a), nb = normName(b)
  if (na === nb) return true
  const aParts = na.split(' ').filter(Boolean)
  const bParts = nb.split(' ').filter(Boolean)
  if (aParts.length >= 2 && bParts.length >= 2) {
    if (aParts[0] === bParts[0] && aParts[aParts.length-1] === bParts[bParts.length-1]) return true
    const nickmap: Record<string,string> = { mike:'michael', matt:'matthew', ben:'benjamin', greg:'gregory', kate:'katrinka', kat:'katrinka', tony:'anthony', ed:'edgardo' }
    const an0 = nickmap[aParts[0]] ?? aParts[0]
    const bn0 = nickmap[bParts[0]] ?? bParts[0]
    if (an0 === bn0 && aParts[aParts.length-1] === bParts[bParts.length-1]) return true
  }
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

function groupMAByBranch(maData: MARecord[]): BranchGroup[] {
  const assigned = new Set<string>()
  const groups: BranchGroup[] = []
  for (const bc of BRANCH_CONFIG) {
    const members: MARecord[] = []
    for (const ma of maData) {
      if (bc.members.some(m => nameSimilar(m, ma.name))) {
        members.push(ma)
        assigned.add(ma.name)
      }
    }
    if (members.length > 0) {
      groups.push({ name: bc.name, color: bc.color, isSolo: false, members })
    }
  }
  for (const ma of maData) {
    if (!assigned.has(ma.name)) {
      const total = ma.ytdFamilies + ma.ytdVolume + ma.ytdRespaApps + ma.ytdInitialApps
      if (total > 0) {
        groups.push({ name: `${ma.name} Branch`, color: C.muted, isSolo: true, members: [ma] })
      }
    }
  }
  return groups
}

const PERIOD_OPTS: { id: PeriodStr; label: string }[] = [
  { id: 'ytd', label: 'YTD' },
  { id: 'range', label: 'Custom Range' },
  ...MONTHS.map((m, i) => ({ id: String(i) as PeriodStr, label: m })),
]

function periodRange(p: PeriodStr, from: number, to: number): [number, number] {
  if (p === 'ytd') return [0, 6]
  if (p === 'range') return [from, to]
  return [Number(p), Number(p)]
}

function periodLabel(p: PeriodStr, from: number, to: number): string {
  if (p === 'ytd') return 'YTD'
  if (p === 'range') return `${MONTHS[from]}–${MONTHS[to]}`
  return MONTHS[Number(p)]
}

function sumMonths(arr: number[], from: number, to: number): number {
  let s = 0
  for (let i = from; i <= to; i++) s += arr[i] ?? 0
  return s
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v/1_000).toFixed(0)}K`
  return `$${v}`
}

function fmtVolFull(v: number): string {
  return '$' + v.toLocaleString()
}

// ─── CSV / XLSX helpers ───────────────────────────────────────────────────────
function parseDate(raw: string | number): Date | null {
  if (typeof raw === 'number') {
    return new Date(Math.round((raw - 25569) * 86400 * 1000))
  }
  const s = String(raw).trim()
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m1) return new Date(Number(m1[3]), Number(m1[1])-1, Number(m1[2]))
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return new Date(Number(m2[1]), Number(m2[2])-1, Number(m2[3]))
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

type CsvRow = Record<string, string | number>

function parseFundingsRows(rows: CsvRow[]): MARecord[] {
  const map = new Map<string, MARecord>()
  const seen = new Set<string>()
  for (const row of rows) {
    const maSupport = String(row['Assigned MA Support'] ?? '').trim()
    const lc = maSupport || String(row['Assigned LC'] ?? '').trim()
    if (!lc) continue
    const loanId = String(row['Loan File ID'] ?? row['LoanFileID'] ?? '')
    const key = `${lc}::${loanId}`
    if (loanId && seen.has(key)) continue
    if (loanId) seen.add(key)
    const dateRaw = row['Funded Date'] ?? row['Close Date'] ?? ''
    const dt = dateRaw ? parseDate(dateRaw as string) : null
    const mo = dt ? dt.getMonth() : -1
    const vol = Number(row['Loan Amount'] ?? row['Volume'] ?? 0)
    const maKey = normName(lc)
    if (!map.has(maKey)) {
      map.set(maKey, {
        name: lc, ytdFamilies: 0, ytdVolume: 0, ytdRespaApps: 0, ytdInitialApps: 0,
        monthlyFamilies: Array(12).fill(0) as number[], monthlyVolume: Array(12).fill(0) as number[],
        monthlyRespaApps: Array(12).fill(0) as number[], monthlyInitialApps: Array(12).fill(0) as number[],
      })
    }
    const rec = map.get(maKey)!
    if (mo >= 0) { rec.monthlyFamilies[mo] += 1; rec.monthlyVolume[mo] += vol }
    rec.ytdFamilies += 1; rec.ytdVolume += vol
  }
  return Array.from(map.values())
}

function parseAppsRows(rows: CsvRow[]): Map<string, { respa: number[]; initial: number[] }> {
  const map = new Map<string, { respa: number[]; initial: number[] }>()
  for (const row of rows) {
    const maSupport = String(row['Assigned MA Support'] ?? '').trim()
    const lc = maSupport || String(row['Assigned LC'] ?? '').trim()
    if (!lc) continue
    const dateRaw = row['Application created at'] ?? row['App Date'] ?? ''
    const dt = dateRaw ? parseDate(dateRaw as string) : null
    const mo = dt ? dt.getMonth() : -1
    const type = String(row['App Type'] ?? row['Application Type'] ?? '')
    const isRespa = /respa/i.test(type)
    const maKey = normName(lc)
    if (!map.has(maKey)) map.set(maKey, { respa: Array(12).fill(0) as number[], initial: Array(12).fill(0) as number[] })
    const rec = map.get(maKey)!
    if (mo >= 0) { if (isRespa) rec.respa[mo] += 1; else rec.initial[mo] += 1 }
  }
  return map
}

async function readRows(file: File): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: 'array' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          resolve(XLSX.utils.sheet_to_json<CsvRow>(ws))
        } catch (err) { reject(err) }
      }
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(Boolean)
        if (lines.length < 2) { resolve([]); return }
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
        const out: CsvRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
          const obj: CsvRow = {}
          headers.forEach((h, j) => { obj[h] = vals[j] ?? '' })
          out.push(obj)
        }
        resolve(out)
      }
      reader.onerror = reject
      reader.readAsText(file)
    }
  })
}

// ─── Email helpers ─────────────────────────────────────────────────────────────
const TO = 'josh.mettle@neohomeloans.com'

function pad(s: string, w: number) { return s.length >= w ? s : s + ' '.repeat(w - s.length) }

function buildAppsEmailBody(maData: MARecord[], weeklyData: WeeklyRow[]): string {
  const now = new Date()
  const dateStr = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`

  const lines: string[] = [
    `NEO FinFree Division — RESPA Files & Initial Apps Report`,
    `Generated: ${dateStr}`,
    ``,
  ]

  // Weekly snapshot
  if (weeklyData.length > 0) {
    const cur = weeklyData[weeklyData.length - 1]
    const prev = weeklyData[weeklyData.length - 2]
    lines.push(`━━━ LATEST WEEK: ${cur.weekLabel} ━━━`, ``)
    lines.push(`Families:     ${cur.families}${prev ? `  (${cur.families - prev.families >= 0 ? '+' : ''}${cur.families - prev.families} WoW)` : ''}`)
    lines.push(`Volume:       ${fmtVol(cur.volume)}`)
    lines.push(`RESPA Apps:   ${cur.respaApps}${prev ? `  (${cur.respaApps - prev.respaApps >= 0 ? '+' : ''}${cur.respaApps - prev.respaApps} WoW)` : ''}`)
    lines.push(`Initial Apps: ${cur.initialApps}${prev ? `  (${cur.initialApps - prev.initialApps >= 0 ? '+' : ''}${cur.initialApps - prev.initialApps} WoW)` : ''}`)
    lines.push(``)
  }

  // Weekly history table
  if (weeklyData.length > 0) {
    lines.push(`━━━ WEEKLY HISTORY ━━━`, ``)
    lines.push(`${pad('Week', 10)}  ${pad('Families', 10)}  ${pad('RESPA Apps', 12)}  Initial Apps`)
    lines.push(`${'─'.repeat(50)}`)
    for (const w of [...weeklyData].reverse()) {
      lines.push(`${pad(w.weekLabel, 10)}  ${pad(String(w.families), 10)}  ${pad(String(w.respaApps), 12)}  ${w.initialApps}`)
    }
    lines.push(``)
  }

  // YTD monthly totals (Jan–Jul)
  lines.push(`━━━ MONTHLY TOTALS (JAN–JUL) ━━━`, ``)
  lines.push(`${pad('Month', 8)}  ${pad('RESPA', 8)}  Initial`)
  lines.push(`${'─'.repeat(30)}`)
  for (let i = 0; i <= 6; i++) {
    const r = maData.reduce((s, m) => s + m.monthlyRespaApps[i], 0)
    const init = maData.reduce((s, m) => s + m.monthlyInitialApps[i], 0)
    if (r > 0 || init > 0) lines.push(`${pad(MONTHS[i], 8)}  ${pad(String(r), 8)}  ${init}`)
  }
  const ytdR = maData.reduce((s, m) => s + m.ytdRespaApps, 0)
  const ytdI = maData.reduce((s, m) => s + m.ytdInitialApps, 0)
  lines.push(`${'─'.repeat(30)}`)
  lines.push(`${pad('YTD', 8)}  ${pad(String(ytdR), 8)}  ${ytdI}`)
  lines.push(``)

  // Branch breakdown
  lines.push(`━━━ BRANCH BREAKDOWN (YTD) ━━━`, ``)
  lines.push(`${pad('Branch', 24)}  ${pad('RESPA', 8)}  Initial`)
  lines.push(`${'─'.repeat(46)}`)
  const branchGroups = groupMAByBranch(maData)
  for (const bg of branchGroups) {
    const r = bg.members.reduce((s, m) => s + m.ytdRespaApps, 0)
    const init = bg.members.reduce((s, m) => s + m.ytdInitialApps, 0)
    lines.push(`${pad(bg.name, 24)}  ${pad(String(r), 8)}  ${init}`)
  }
  lines.push(``)

  // Individual MA breakdown
  lines.push(`━━━ INDIVIDUAL MA BREAKDOWN (YTD) ━━━`, ``)
  lines.push(`${pad('Name', 24)}  ${pad('Branch', 20)}  ${pad('RESPA', 7)}  Initial`)
  lines.push(`${'─'.repeat(66)}`)
  const sorted = [...maData].filter(m => m.ytdRespaApps + m.ytdInitialApps > 0).sort((a, b) => b.ytdRespaApps - a.ytdRespaApps)
  for (const ma of sorted) {
    const bc = BRANCH_CONFIG.find(b => b.members.some(m => nameSimilar(m, ma.name)))
    lines.push(`${pad(ma.name, 24)}  ${pad(bc?.name ?? 'Solo', 20)}  ${pad(String(ma.ytdRespaApps), 7)}  ${ma.ytdInitialApps}`)
  }
  lines.push(``, `— NEO FinFree Division`)
  return lines.join('\n')
}

function buildProductionEmailBody(maData: MARecord[], prevMonthIdx: number): string {
  const monthName = MONTHS[prevMonthIdx]
  const lines: string[] = [
    `NEO FinFree Division — ${monthName} 2026 Production Numbers`,
    ``,
  ]

  // Team total
  const teamFam = maData.reduce((s, m) => s + (m.monthlyFamilies[prevMonthIdx] ?? 0), 0)
  const teamVol = maData.reduce((s, m) => s + (m.monthlyVolume[prevMonthIdx] ?? 0), 0)
  const teamR = maData.reduce((s, m) => s + (m.monthlyRespaApps[prevMonthIdx] ?? 0), 0)
  const teamI = maData.reduce((s, m) => s + (m.monthlyInitialApps[prevMonthIdx] ?? 0), 0)
  lines.push(`DIVISION TOTAL`)
  lines.push(`  Families:  ${teamFam}`)
  lines.push(`  Volume:    ${fmtVol(teamVol)}  (${fmtVolFull(teamVol)})`)
  lines.push(`  RESPA Apps: ${teamR}`)
  lines.push(`  Initial Apps: ${teamI}`)
  lines.push(``)

  // Branch breakdown
  lines.push(`━━━ BRANCH BREAKDOWN ━━━`, ``)
  lines.push(`${pad('Branch', 24)}  ${pad('Families', 10)}  ${pad('Volume', 14)}  RESPA`)
  lines.push(`${'─'.repeat(60)}`)
  const branches = groupMAByBranch(maData)
  for (const bg of branches) {
    const f = bg.members.reduce((s, m) => s + (m.monthlyFamilies[prevMonthIdx] ?? 0), 0)
    const v = bg.members.reduce((s, m) => s + (m.monthlyVolume[prevMonthIdx] ?? 0), 0)
    const r = bg.members.reduce((s, m) => s + (m.monthlyRespaApps[prevMonthIdx] ?? 0), 0)
    if (f + v + r > 0) lines.push(`${pad(bg.name, 24)}  ${pad(String(f), 10)}  ${pad(fmtVol(v), 14)}  ${r}`)
  }
  lines.push(``)

  // Individual stats
  lines.push(`━━━ INDIVIDUAL STATS ━━━`, ``)
  lines.push(`${pad('Name', 24)}  ${pad('Families', 10)}  ${pad('Volume', 14)}  RESPA`)
  lines.push(`${'─'.repeat(60)}`)
  const sorted = [...maData]
    .filter(m => (m.monthlyFamilies[prevMonthIdx] ?? 0) + (m.monthlyVolume[prevMonthIdx] ?? 0) > 0)
    .sort((a, b) => (b.monthlyFamilies[prevMonthIdx] ?? 0) - (a.monthlyFamilies[prevMonthIdx] ?? 0))
  for (const ma of sorted) {
    const f = ma.monthlyFamilies[prevMonthIdx] ?? 0
    const v = ma.monthlyVolume[prevMonthIdx] ?? 0
    const r = ma.monthlyRespaApps[prevMonthIdx] ?? 0
    lines.push(`${pad(ma.name, 24)}  ${pad(String(f), 10)}  ${pad(fmtVol(v), 14)}  ${r}`)
  }

  // Top 3
  const top3 = [...maData].filter(m => (m.monthlyFamilies[prevMonthIdx] ?? 0) > 0).sort((a, b) => (b.monthlyFamilies[prevMonthIdx] ?? 0) - (a.monthlyFamilies[prevMonthIdx] ?? 0)).slice(0, 3)
  if (top3.length > 0) {
    lines.push(``, `━━━ TOP PRODUCERS — ${monthName} ━━━`, ``)
    const medals = ['🥇', '🥈', '🥉']
    top3.forEach((ma, i) => {
      const f = ma.monthlyFamilies[prevMonthIdx] ?? 0
      const v = ma.monthlyVolume[prevMonthIdx] ?? 0
      lines.push(`${medals[i]}  ${ma.name} — ${f} families, ${fmtVol(v)}`)
    })
  }
  lines.push(``, `— NEO FinFree Division`)
  return lines.join('\n')
}

function EmailReportButton({ subject, body, label }: { subject: string; body: string; label: string }) {
  function handleClick() {
    const href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(href, '_blank')
  }
  return (
    <button onClick={handleClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
      background: C.navy, color: '#fff', fontWeight: 700, fontSize: 13,
      boxShadow: '0 2px 8px rgba(10,37,64,0.18)', transition: 'opacity 0.12s',
    }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      {label}
    </button>
  )
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, ...style }}>
      {children}
    </div>
  )
}

function CardHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.navy }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
    </div>
  )
}

interface ToggleOption { id: string; label: string }
function ToggleGroup({ options, value, onChange }: { options: ToggleOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: '#F0F2F5', borderRadius: 8, padding: 3 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{
          padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
          fontWeight: value === o.id ? 600 : 400,
          background: value === o.id ? C.white : 'transparent',
          color: value === o.id ? C.navy : C.dim,
          boxShadow: value === o.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          transition: 'all 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  )
}

function RangeSelector({ from, to, onChange }: { from: number; to: number; onChange: (f: number, t: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: C.dim }}>From</span>
      <select value={from} onChange={e => onChange(Number(e.target.value), to)} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <span style={{ color: C.dim }}>To</span>
      <select value={to} onChange={e => onChange(from, Number(e.target.value))} style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, color: C.text }}>
        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
      </select>
    </div>
  )
}

function UploadZone({ label, onFile, loading, message }: { label: string; onFile: (f: File) => void; loading?: boolean; message?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? C.accent : C.border}`, borderRadius: 10, padding: '18px 24px',
        textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(91,203,245,0.05)' : C.bg,
        transition: 'all 0.15s'
      }}
    >
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <div style={{ fontSize: 22, marginBottom: 4 }}>📂</div>
      <div style={{ fontSize: 13, color: C.dim }}>{loading ? 'Processing…' : label}</div>
      {message && <div style={{ fontSize: 12, color: C.green, marginTop: 4 }}>{message}</div>}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span style={{ fontSize: 12, color: C.muted }}>—</span>
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
      background: delta > 0 ? C.greenBg : 'rgba(220,38,38,0.08)',
      color: delta > 0 ? C.green : C.red,
    }}>
      {delta > 0 ? `+${delta}` : delta}
    </span>
  )
}

type BadgeStatus = 'qualified' | 'ontrack' | 'rising'
function StatusBadge({ status }: { status: BadgeStatus }) {
  const cfg: Record<BadgeStatus, { bg: string; color: string; label: string }> = {
    qualified: { bg: '#7c3aed', color: '#fff', label: 'Change Maker Qualified' },
    ontrack:   { bg: '#d97706', color: '#fff', label: 'On Track for Change Maker' },
    rising:    { bg: '#F4F6F8', color: C.navy, label: 'On the Rise' },
  }
  const s = cfg[status]
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

// ─── HoverBarChart ─────────────────────────────────────────────────────────────
interface HoverBarChartProps {
  values: number[]
  labels: string[]
  color: string
  fmt: (v: number) => string
  secondValues?: number[]
  secondColor?: string
  secondLabel?: string
  primaryLabel?: string
}
function HoverBarChart({ values, labels, color, fmt, secondValues, secondColor, secondLabel, primaryLabel }: HoverBarChartProps) {
  const [hov, setHov] = useState<{ idx: number; x: number; y: number } | null>(null)
  const maxVal = Math.max(...values, ...(secondValues ?? []), 1)
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120 }}>
        {values.map((v, i) => {
          const isHov = hov?.idx === i
          const h1 = Math.max(2, (v / maxVal) * 110)
          const h2 = secondValues ? Math.max(2, ((secondValues[i] ?? 0) / maxVal) * 110) : 0
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2 }}
              onMouseEnter={e => setHov({ idx: i, x: e.clientX, y: e.clientY })}
              onMouseMove={e => setHov(h => h ? { ...h, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => setHov(null)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
                {secondValues && (
                  <div style={{ flex: 1, height: h2, background: secondColor ?? '#a78bfa', opacity: isHov ? 1 : 0.35, borderRadius: '3px 3px 0 0', transition: 'opacity 0.1s' }} />
                )}
                <div style={{ flex: 1, height: h1, background: color, opacity: isHov ? 1 : 0.6, borderRadius: '3px 3px 0 0', transition: 'opacity 0.1s' }} />
              </div>
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 1 }}>{labels[i]}</div>
            </div>
          )
        })}
      </div>
      {hov && (
        <div style={{
          position: 'fixed', left: hov.x + 12, top: hov.y - 40, zIndex: 9999,
          background: C.navy, color: C.white, borderRadius: 8, padding: '8px 12px',
          fontSize: 12, pointerEvents: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: 120,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels[hov.idx]}</div>
          <div>{primaryLabel ?? 'Value'}: {fmt(values[hov.idx])}</div>
          {secondValues && <div style={{ color: secondColor ?? '#a78bfa', marginTop: 2 }}>{secondLabel ?? 'Alt'}: {fmt(secondValues[hov.idx] ?? 0)}</div>}
        </div>
      )}
    </div>
  )
}

// ─── Branch Production Tab ────────────────────────────────────────────────────
function BranchProductionTab({ maData, onFundingsUpload }: { maData: MARecord[]; onFundingsUpload: (file: File) => void }) {
  const [period, setPeriod] = useState<PeriodStr>('ytd')
  const [rangeFrom, setRangeFrom] = useState(0)
  const [rangeTo, setRangeTo] = useState(6)
  const [metric, setMetric] = useState('volume')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(BRANCH_CONFIG.map(b => b.name)))
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const [fr, to] = periodRange(period, rangeFrom, rangeTo)
  const branches = groupMAByBranch(maData)

  const totalFamilies = maData.reduce((s, m) => s + sumMonths(m.monthlyFamilies, fr, to), 0)
  const totalVolume = maData.reduce((s, m) => s + sumMonths(m.monthlyVolume, fr, to), 0)
  const totalRespa = maData.reduce((s, m) => s + sumMonths(m.monthlyRespaApps, fr, to), 0)
  const totalInitial = maData.reduce((s, m) => s + sumMonths(m.monthlyInitialApps, fr, to), 0)

  const teamFamilies = MONTHS.map((_, i) => maData.reduce((s, m) => s + m.monthlyFamilies[i], 0))
  const teamVolume = MONTHS.map((_, i) => maData.reduce((s, m) => s + m.monthlyVolume[i], 0))

  const sorted = [...maData].sort((a, b) =>
    metric === 'volume'
      ? sumMonths(b.monthlyVolume, fr, to) - sumMonths(a.monthlyVolume, fr, to)
      : sumMonths(b.monthlyFamilies, fr, to) - sumMonths(a.monthlyFamilies, fr, to)
  )

  function toggleBranch(name: string) {
    setExpanded(prev => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n })
  }

  async function handleUpload(file: File) {
    setUploadLoading(true)
    try { await readRows(file); onFundingsUpload(file); setUploadMsg(`Loaded ${file.name}`) }
    catch { setUploadMsg('Error reading file') }
    setUploadLoading(false)
  }

  const metricOpts: ToggleOption[] = [{ id: 'volume', label: 'Volume' }, { id: 'families', label: 'Families' }]

  // Previous month = June (idx 5) while we're in July
  const prevMonthIdx = 5
  const prodSubject = `${MONTHS[prevMonthIdx]} Production Numbers`
  const prodBody = buildProductionEmailBody(maData, prevMonthIdx)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <ToggleGroup options={PERIOD_OPTS} value={period} onChange={v => setPeriod(v as PeriodStr)} />
        {period === 'range' && <RangeSelector from={rangeFrom} to={rangeTo} onChange={(f,t) => { setRangeFrom(f); setRangeTo(t) }} />}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <ToggleGroup options={metricOpts} value={metric} onChange={setMetric} />
          <EmailReportButton subject={prodSubject} body={prodBody} label="Email June Report" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile label="Families Helped" value={String(totalFamilies)} sub={periodLabel(period, rangeFrom, rangeTo)} />
        <KpiTile label="Total Volume" value={fmtVol(totalVolume)} sub={periodLabel(period, rangeFrom, rangeTo)} />
        <KpiTile label="RESPA Apps" value={String(totalRespa)} sub={periodLabel(period, rangeFrom, rangeTo)} />
        <KpiTile label="Initial Apps" value={String(totalInitial)} sub={periodLabel(period, rangeFrom, rangeTo)} />
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <CardHead title="Monthly Families" subtitle="All team members" />
          <HoverBarChart values={teamFamilies} labels={MONTHS} color={C.accent} fmt={String} primaryLabel="Families" />
        </Card>
        <Card style={{ flex: 1 }}>
          <CardHead title="Monthly Volume" subtitle="All team members" />
          <HoverBarChart values={teamVolume} labels={MONTHS} color="#7c3aed" fmt={fmtVol} primaryLabel="Volume" />
        </Card>
      </div>

      <Card>
        <CardHead title="Branch Breakdown" />
        {branches.map(branch => {
          const branchFam = branch.members.reduce((s, m) => s + sumMonths(m.monthlyFamilies, fr, to), 0)
          const branchVol = branch.members.reduce((s, m) => s + sumMonths(m.monthlyVolume, fr, to), 0)
          const isOpen = expanded.has(branch.name)
          const maxMetric = Math.max(...branch.members.map(m =>
            metric === 'volume' ? sumMonths(m.monthlyVolume, fr, to) : sumMonths(m.monthlyFamilies, fr, to)
          ), 1)
          return (
            <div key={branch.name} style={{ marginBottom: 12 }}>
              <div onClick={() => toggleBranch(branch.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer', borderBottom: `1px solid ${C.borderSoft}` }}>
                <div style={{ width: 4, height: 32, borderRadius: 2, background: branch.color, flexShrink: 0 }} />
                <div style={{ fontWeight: 700, color: C.navy, flex: 1 }}>{branch.name}</div>
                <div style={{ fontSize: 13, color: C.dim }}>{branchFam} families · {fmtVol(branchVol)}</div>
                <div style={{ fontSize: 14, color: C.muted }}>{isOpen ? '▲' : '▼'}</div>
              </div>
              {isOpen && (
                <div style={{ paddingTop: 10, paddingLeft: 16 }}>
                  {branch.members.map(ma => {
                    const mv = metric === 'volume' ? sumMonths(ma.monthlyVolume, fr, to) : sumMonths(ma.monthlyFamilies, fr, to)
                    const pct = mv / maxMetric
                    return (
                      <div key={ma.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 130, fontSize: 13, color: C.text, flexShrink: 0 }}>{ma.name}</div>
                        <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{ width: `${pct*100}%`, height: '100%', background: branch.color, borderRadius: 5, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ width: 90, textAlign: 'right', fontSize: 13, fontWeight: 600, color: C.text }}>
                          {metric === 'volume' ? fmtVol(mv) : `${mv} fam`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </Card>

      <Card>
        <CardHead title="Leaderboard" subtitle={`Ranked by ${metric} — ${periodLabel(period, rangeFrom, rangeTo)}`} />
        {sorted.slice(0, 15).map((ma, i) => {
          const mv = metric === 'volume' ? sumMonths(ma.monthlyVolume, fr, to) : sumMonths(ma.monthlyFamilies, fr, to)
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
          return (
            <div key={ma.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: `1px solid ${C.bg}` }}>
              <div style={{ width: 28, fontWeight: 700, fontSize: 14, color: C.navy }}>{medal}</div>
              <div style={{ flex: 1, fontSize: 13, color: C.text }}>{ma.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{metric === 'volume' ? fmtVol(mv) : mv}</div>
            </div>
          )
        })}
      </Card>

      <Card>
        <CardHead title="Full Detail" subtitle="YTD — all metrics" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Rank','Name','Branch','Families','Volume','RESPA Apps','Initial Apps','Conv%'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Rank' ? 'center' : 'left', color: C.dim, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((ma, i) => {
                const branchMatch = BRANCH_CONFIG.find(b => b.members.some(m => nameSimilar(m, ma.name)))
                const conv = ma.ytdRespaApps > 0 ? ((ma.ytdFamilies / ma.ytdRespaApps) * 100).toFixed(0) + '%' : '—'
                return (
                  <tr key={ma.name} style={{ borderBottom: `1px solid ${C.bg}` }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: C.muted }}>{i+1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: C.navy }}>{ma.name}</td>
                    <td style={{ padding: '8px 12px', color: C.dim }}>{branchMatch?.name ?? '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{ma.ytdFamilies}</td>
                    <td style={{ padding: '8px 12px' }}>{fmtVol(ma.ytdVolume)}</td>
                    <td style={{ padding: '8px 12px' }}>{ma.ytdRespaApps}</td>
                    <td style={{ padding: '8px 12px' }}>{ma.ytdInitialApps}</td>
                    <td style={{ padding: '8px 12px' }}>{conv}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHead title="Upload Fundings CSV" subtitle="Drop a fundings export to refresh production data" />
        <UploadZone label="Drop YTD Fundings CSV / XLSX here, or click to browse" onFile={handleUpload} loading={uploadLoading} message={uploadMsg} />
      </Card>
    </div>
  )
}

// ─── Applications Tab ─────────────────────────────────────────────────────────
function ApplicationsTab({ maData, weeklyData, onAppsUpload, onWeekUpload }: {
  maData: MARecord[]
  weeklyData: WeeklyRow[]
  onAppsUpload: (file: File, type: 'respa'|'initial') => void
  onWeekUpload: (file: File) => void
}) {
  const [subView, setSubView] = useState('branch')
  const [period, setPeriod] = useState<PeriodStr>('ytd')
  const [rangeFrom, setRangeFrom] = useState(0)
  const [rangeTo, setRangeTo] = useState(6)
  const [appMetric, setAppMetric] = useState('both')
  const [respaLoading, setRespaLoading] = useState(false)
  const [respaMsg, setRespaMsg] = useState('')
  const [initLoading, setInitLoading] = useState(false)
  const [initMsg, setInitMsg] = useState('')
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekMsg, setWeekMsg] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(BRANCH_CONFIG.map(b => b.name)))

  const [fr, to] = periodRange(period, rangeFrom, rangeTo)
  const branches = groupMAByBranch(maData)
  const teamRespa = MONTHS.map((_, i) => maData.reduce((s, m) => s + m.monthlyRespaApps[i], 0))
  const teamInitial = MONTHS.map((_, i) => maData.reduce((s, m) => s + m.monthlyInitialApps[i], 0))

  function toggleBranch(name: string) {
    setExpanded(prev => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n })
  }

  const curWeek = weeklyData[weeklyData.length - 1]
  const prevWeek = weeklyData[weeklyData.length - 2]

  const subViewOpts: ToggleOption[] = [{ id: 'branch', label: 'By Branch & MA' }, { id: 'weekly', label: 'Weekly Tracking' }]
  const appMetricOpts: ToggleOption[] = [{ id: 'respa', label: 'RESPA Apps' }, { id: 'initial', label: 'Initial Apps' }, { id: 'both', label: 'Both' }]

  const appsSubject = `RESPA files & Initial Apps ${new Date().toLocaleDateString('en-US')}`
  const appsBody = buildAppsEmailBody(maData, weeklyData)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <ToggleGroup options={subViewOpts} value={subView} onChange={setSubView} />
        <EmailReportButton subject={appsSubject} body={appsBody} label="Email Report" />
      </div>

      {subView === 'branch' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <ToggleGroup options={PERIOD_OPTS} value={period} onChange={v => setPeriod(v as PeriodStr)} />
            {period === 'range' && <RangeSelector from={rangeFrom} to={rangeTo} onChange={(f,t) => { setRangeFrom(f); setRangeTo(t) }} />}
            <div style={{ marginLeft: 'auto' }}>
              <ToggleGroup options={appMetricOpts} value={appMetric} onChange={setAppMetric} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            {(appMetric === 'respa' || appMetric === 'both') && (
              <Card style={{ flex: 1 }}>
                <CardHead title="Monthly RESPA Apps" />
                <HoverBarChart values={teamRespa} labels={MONTHS} color="#7c3aed" fmt={String} primaryLabel="RESPA Apps" />
              </Card>
            )}
            {(appMetric === 'initial' || appMetric === 'both') && (
              <Card style={{ flex: 1 }}>
                <CardHead title="Monthly Initial Apps" />
                <HoverBarChart values={teamInitial} labels={MONTHS} color={C.accent} fmt={String} primaryLabel="Initial Apps" />
              </Card>
            )}
          </div>

          <Card>
            <CardHead title="Branch & MA Applications" />
            {branches.map(branch => {
              const brRespa = branch.members.reduce((s, m) => s + sumMonths(m.monthlyRespaApps, fr, to), 0)
              const brInitial = branch.members.reduce((s, m) => s + sumMonths(m.monthlyInitialApps, fr, to), 0)
              const isOpen = expanded.has(branch.name)
              return (
                <div key={branch.name} style={{ marginBottom: 12 }}>
                  <div onClick={() => toggleBranch(branch.name)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer', borderBottom: `1px solid ${C.borderSoft}` }}>
                    <div style={{ width: 4, height: 32, borderRadius: 2, background: branch.color, flexShrink: 0 }} />
                    <div style={{ fontWeight: 700, color: C.navy, flex: 1 }}>{branch.name}</div>
                    <div style={{ fontSize: 13, color: C.dim }}>RESPA: {brRespa} · Initial: {brInitial}</div>
                    <div style={{ fontSize: 14, color: C.muted }}>{isOpen ? '▲' : '▼'}</div>
                  </div>
                  {isOpen && (
                    <div style={{ paddingTop: 8, paddingLeft: 16 }}>
                      {branch.members.map(ma => {
                        const maRespa = sumMonths(ma.monthlyRespaApps, fr, to)
                        const maInit = sumMonths(ma.monthlyInitialApps, fr, to)
                        return (
                          <div key={ma.name} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0', borderBottom: `1px solid ${C.bg}` }}>
                            <div style={{ flex: 1, fontSize: 13, color: C.text }}>{ma.name}</div>
                            {(appMetric === 'respa' || appMetric === 'both') && (
                              <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>RESPA: {maRespa}</div>
                            )}
                            {(appMetric === 'initial' || appMetric === 'both') && (
                              <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Initial: {maInit}</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>

          <div style={{ display: 'flex', gap: 16 }}>
            <Card style={{ flex: 1 }}>
              <CardHead title="Upload RESPA Apps CSV" />
              <UploadZone
                label="Drop RESPA Apps CSV / XLSX"
                onFile={async (f) => {
                  setRespaLoading(true)
                  try { await readRows(f); onAppsUpload(f, 'respa'); setRespaMsg(`Loaded ${f.name}`) }
                  catch { setRespaMsg('Error') }
                  setRespaLoading(false)
                }}
                loading={respaLoading} message={respaMsg}
              />
            </Card>
            <Card style={{ flex: 1 }}>
              <CardHead title="Upload Initial Apps CSV" />
              <UploadZone
                label="Drop Initial Apps CSV / XLSX"
                onFile={async (f) => {
                  setInitLoading(true)
                  try { await readRows(f); onAppsUpload(f, 'initial'); setInitMsg(`Loaded ${f.name}`) }
                  catch { setInitMsg('Error') }
                  setInitLoading(false)
                }}
                loading={initLoading} message={initMsg}
              />
            </Card>
          </div>
        </>
      )}

      {subView === 'weekly' && (
        <>
          {/* ── Team-level weekly snapshot ── */}
          {curWeek && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <KpiTile label="This Week Families" value={String(curWeek.families)} sub={curWeek.weekLabel} />
                <KpiTile label="This Week Volume" value={fmtVol(curWeek.volume)} sub={curWeek.weekLabel} />
                <KpiTile label="This Week RESPA" value={String(curWeek.respaApps)} sub={curWeek.weekLabel} />
                <KpiTile label="This Week Initial" value={String(curWeek.initialApps)} sub={curWeek.weekLabel} />
              </div>
              {prevWeek && (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: C.dim, alignItems: 'center' }}>
                  <span>WoW Families: <DeltaBadge delta={curWeek.families - prevWeek.families} /></span>
                  <span>WoW RESPA: <DeltaBadge delta={curWeek.respaApps - prevWeek.respaApps} /></span>
                  <span>WoW Initial: <DeltaBadge delta={curWeek.initialApps - prevWeek.initialApps} /></span>
                </div>
              )}
            </>
          )}

          {/* ── Team trend charts ── */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Card style={{ flex: 1 }}>
              <CardHead title="Team — Monthly RESPA Apps" subtitle="All branches combined" />
              <HoverBarChart values={teamRespa.slice(0,7)} labels={MONTHS.slice(0,7)} color="#7c3aed" fmt={String} primaryLabel="RESPA Apps" />
            </Card>
            <Card style={{ flex: 1 }}>
              <CardHead title="Team — Monthly Initial Apps" subtitle="All branches combined" />
              <HoverBarChart values={teamInitial.slice(0,7)} labels={MONTHS.slice(0,7)} color={C.accent} fmt={String} primaryLabel="Initial Apps" />
            </Card>
          </div>

          {/* ── Branch trend cards ── */}
          <div style={{ fontWeight: 700, fontSize: 15, color: C.navy, marginTop: 4 }}>Branch Trends (Jan–Jul)</div>
          {branches.filter(b => b.members.some(m => m.ytdRespaApps + m.ytdInitialApps > 0)).map(branch => {
            const brMonthlyRespa = MONTHS.slice(0,7).map((_, i) =>
              branch.members.reduce((s, m) => s + m.monthlyRespaApps[i], 0)
            )
            const brMonthlyInit = MONTHS.slice(0,7).map((_, i) =>
              branch.members.reduce((s, m) => s + m.monthlyInitialApps[i], 0)
            )
            const brYtdRespa = brMonthlyRespa.reduce((a,b)=>a+b,0)
            const brYtdInit = brMonthlyInit.reduce((a,b)=>a+b,0)
            return (
              <Card key={branch.name} style={{ borderTop: `3px solid ${branch.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: branch.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.navy }}>{branch.name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                      {brYtdRespa} RESPA · {brYtdInit} Initial YTD
                    </div>
                  </div>
                </div>

                {/* Branch trend charts */}
                <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>RESPA Apps / Month</div>
                    <HoverBarChart values={brMonthlyRespa} labels={MONTHS.slice(0,7)} color={branch.color} fmt={String} primaryLabel="RESPA" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 6 }}>Initial Apps / Month</div>
                    <HoverBarChart values={brMonthlyInit} labels={MONTHS.slice(0,7)} color={branch.color} fmt={String} primaryLabel="Initial" />
                  </div>
                </div>

                {/* Individual MA rows within branch */}
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 8 }}>Individual Trends</div>
                  {branch.members.filter(m => m.ytdRespaApps + m.ytdInitialApps > 0).map(ma => {
                    const maRespa = ma.monthlyRespaApps.slice(0, 7)
                    const maInit  = ma.monthlyInitialApps.slice(0, 7)
                    const peakR   = Math.max(...maRespa, 1)
                    const peakI   = Math.max(...maInit, 1)
                    return (
                      <div key={ma.name} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.navy }}>{ma.name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>
                            <span style={{ color: '#7c3aed', fontWeight: 600 }}>{ma.ytdRespaApps} RESPA</span>
                            {' · '}
                            <span style={{ color: branch.color, fontWeight: 600 }}>{ma.ytdInitialApps} Initial</span>
                          </div>
                        </div>
                        {/* Dual mini bar — RESPA (purple) and Initial (branch color) per month */}
                        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 52 }}>
                          {MONTHS.slice(0,7).map((mo, i) => {
                            const hR = Math.max(2, (maRespa[i] / peakR) * 44)
                            const hI = Math.max(2, (maInit[i] / peakI) * 44)
                            const hasData = maRespa[i] + maInit[i] > 0
                            return (
                              <div key={mo} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}
                                title={`${mo}: ${maRespa[i]} RESPA, ${maInit[i]} Initial`}>
                                <div style={{ width: '100%', display: 'flex', gap: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                                  <div style={{ flex: 1, height: hasData ? hR : 2, background: maRespa[i] > 0 ? '#7c3aed' : C.border, borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
                                  <div style={{ flex: 1, height: hasData ? hI : 2, background: maInit[i] > 0 ? branch.color : C.border, borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
                                </div>
                                <div style={{ fontSize: 9, color: C.muted, lineHeight: 1, textAlign: 'center' }}>{mo}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}

          {/* ── Weekly history table ── */}
          <Card>
            <CardHead title="Team Weekly History" subtitle="Upload weekly CSVs to populate this table" />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {['Week','Families','Δ Fam','Volume','RESPA Apps','Δ RESPA','Initial Apps','Δ Initial'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.dim, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...weeklyData].reverse().map((w, i, arr) => {
                    const prev = arr[i+1]
                    return (
                      <tr key={w.weekLabel} style={{ borderBottom: `1px solid ${C.bg}` }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{w.weekLabel}</td>
                        <td style={{ padding: '8px 12px' }}>{w.families}</td>
                        <td style={{ padding: '8px 12px' }}>{prev ? <DeltaBadge delta={w.families - prev.families} /> : '—'}</td>
                        <td style={{ padding: '8px 12px' }}>{fmtVol(w.volume)}</td>
                        <td style={{ padding: '8px 12px' }}>{w.respaApps}</td>
                        <td style={{ padding: '8px 12px' }}>{prev ? <DeltaBadge delta={w.respaApps - prev.respaApps} /> : '—'}</td>
                        <td style={{ padding: '8px 12px' }}>{w.initialApps}</td>
                        <td style={{ padding: '8px 12px' }}>{prev ? <DeltaBadge delta={w.initialApps - prev.initialApps} /> : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHead title="Upload Weekly Data" />
            <UploadZone
              label="Drop weekly data CSV / XLSX"
              onFile={async (f) => {
                setWeekLoading(true)
                try { await readRows(f); onWeekUpload(f); setWeekMsg(`Loaded ${f.name}`) }
                catch { setWeekMsg('Error') }
                setWeekLoading(false)
              }}
              loading={weekLoading} message={weekMsg}
            />
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Changemakers Tab ─────────────────────────────────────────────────────────
const PROJ_FACTOR = 365 / 196

function getIndivStatus(ytdVol: number, ytdFam: number): BadgeStatus {
  const pV = ytdVol * PROJ_FACTOR, pF = ytdFam * PROJ_FACTOR
  if (pV >= 27_500_000 || pF >= 75) return 'qualified'
  if (pV >= 14_000_000 || pF >= 38) return 'ontrack'
  return 'rising'
}

function getBranchStatus(ytdVol: number, ytdFam: number): BadgeStatus {
  const pV = ytdVol * PROJ_FACTOR, pF = ytdFam * PROJ_FACTOR
  if (pV >= 50_000_000 || pF >= 150) return 'qualified'
  if (pV >= 25_000_000 || pF >= 70) return 'ontrack'
  return 'rising'
}

function ChangemakersTab({ maData }: { maData: MARecord[] }) {
  const totalFam = maData.reduce((s, m) => s + m.ytdFamilies, 0)
  const totalVol = maData.reduce((s, m) => s + m.ytdVolume, 0)
  const projFam = Math.round(totalFam * PROJ_FACTOR)
  const projVol = Math.round(totalVol * PROJ_FACTOR)
  const branches = groupMAByBranch(maData)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #6d28d9 0%, #0A2540 100%)', borderRadius: 16, padding: '40px 36px', color: '#fff' }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>We&#39;re building something special! 🏆</div>
        <div style={{ fontSize: 16, opacity: 0.85, marginBottom: 6 }}>2026 FinFree Division · YTD results and projected year-end pace</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>As of July 15, 2026</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile label="Divisional YTD Families" value={String(totalFam)} sub="Jan–Jul 2026" />
        <KpiTile label="Divisional YTD Volume" value={fmtVol(totalVol)} sub="Jan–Jul 2026" />
        <KpiTile label="Projected EOY Families" value={String(projFam)} sub="At current pace" />
        <KpiTile label="Projected EOY Volume" value={fmtVol(projVol)} sub="At current pace" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginRight: 8 }}>Status Guide:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status="qualified" />
            <span style={{ fontSize: 12, color: C.dim }}>Proj. ≥$27.5M or ≥75 fam (individual) · ≥$50M or ≥150 (branch)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status="ontrack" />
            <span style={{ fontSize: 12, color: C.dim }}>Proj. ≥$14M or ≥38 fam (individual) · ≥$25M or ≥70 (branch)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status="rising" />
            <span style={{ fontSize: 12, color: C.dim }}>Keep climbing!</span>
          </div>
        </div>
      </Card>

      <Card>
        <CardHead title="Changemakers Standings" subtitle="Projected EOY = YTD × 1.863 (365 ÷ 196 days)" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {['Name','YTD Families','YTD Volume','Proj. Families','Proj. Volume','Status'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.dim, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => {
                const bFam = branch.members.reduce((s, m) => s + m.ytdFamilies, 0)
                const bVol = branch.members.reduce((s, m) => s + m.ytdVolume, 0)
                const bProjFam = Math.round(bFam * PROJ_FACTOR)
                const bProjVol = Math.round(bVol * PROJ_FACTOR)
                const bStatus = getBranchStatus(bVol, bFam)
                return (
                  <>
                    <tr key={`br-${branch.name}`} style={{ background: '#F8F9FB', borderBottom: `2px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 800, color: C.navy, borderLeft: `4px solid ${branch.color}` }}>{branch.name}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{bFam}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtVolFull(bVol)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{bProjFam}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{fmtVolFull(bProjVol)}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={bStatus} /></td>
                    </tr>
                    {branch.members.map(ma => {
                      const pFam = Math.round(ma.ytdFamilies * PROJ_FACTOR)
                      const pVol = Math.round(ma.ytdVolume * PROJ_FACTOR)
                      const st = getIndivStatus(ma.ytdVolume, ma.ytdFamilies)
                      return (
                        <tr key={ma.name} style={{ borderBottom: `1px solid ${C.bg}` }}>
                          <td style={{ padding: '8px 12px 8px 28px', color: C.text }}>{ma.name}</td>
                          <td style={{ padding: '8px 12px' }}>{ma.ytdFamilies}</td>
                          <td style={{ padding: '8px 12px' }}>{fmtVolFull(ma.ytdVolume)}</td>
                          <td style={{ padding: '8px 12px', color: C.dim }}>{pFam}</td>
                          <td style={{ padding: '8px 12px', color: C.dim }}>{fmtVolFull(pVol)}</td>
                          <td style={{ padding: '8px 12px' }}><StatusBadge status={st} /></td>
                        </tr>
                      )
                    })}
                  </>
                )
              })}
              <tr style={{ background: C.navy }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#fff' }}>Division Total</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>{totalFam}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#fff' }}>{fmtVolFull(totalVol)}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: C.accent }}>{projFam}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: C.accent }}>{fmtVolFull(projVol)}</td>
                <td style={{ padding: '12px 16px' }} />
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
        <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Qualification Thresholds</div>
        <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.7 }}>
          <strong>Individual — Change Maker Qualified:</strong> Projected EOY ≥ $27.5M or ≥ 75 families<br />
          <strong>Individual — On Track:</strong> Projected EOY ≥ $14M or ≥ 38 families<br />
          <strong>Branch — Change Maker Qualified:</strong> Projected EOY ≥ $50M or ≥ 150 families<br />
          <strong>Branch — On Track:</strong> Projected EOY ≥ $25M or ≥ 70 families<br />
          <strong>Projection factor:</strong> 365 ÷ 196 ≈ 1.863 (YTD through July 15, 2026)
        </div>
      </Card>
    </div>
  )
}

// ─── Root Production component ────────────────────────────────────────────────
export default function Production() {
  const [maData, setMaData] = useState<MARecord[]>(SEED_MA)
  const [weeklyData, setWeeklyData] = useState<WeeklyRow[]>(SEED_WEEKLY)
  const [activeTab, setActiveTab] = useState<'branch'|'apps'|'changemakers'>('branch')

  const handleFundingsUpload = useCallback(async (file: File) => {
    const rows = await readRows(file)
    const parsed = parseFundingsRows(rows)
    setMaData(prev => {
      const next = [...prev]
      for (const p of parsed) {
        const idx = next.findIndex(m => nameSimilar(m.name, p.name))
        if (idx >= 0) {
          next[idx] = { ...next[idx], ytdFamilies: p.ytdFamilies, ytdVolume: p.ytdVolume, monthlyFamilies: p.monthlyFamilies, monthlyVolume: p.monthlyVolume }
        } else {
          next.push(p)
        }
      }
      return next
    })
  }, [])

  const handleAppsUpload = useCallback(async (file: File, type: 'respa'|'initial') => {
    const rows = await readRows(file)
    const parsed = parseAppsRows(rows)
    setMaData(prev => {
      const next = [...prev]
      parsed.forEach((appData, maKey) => {
        const idx = next.findIndex(m => normName(m.name) === maKey || nameSimilar(m.name, maKey))
        if (idx >= 0) {
          if (type === 'respa') {
            next[idx] = { ...next[idx], monthlyRespaApps: appData.respa, ytdRespaApps: appData.respa.reduce((a,b)=>a+b,0) }
          } else {
            next[idx] = { ...next[idx], monthlyInitialApps: appData.initial, ytdInitialApps: appData.initial.reduce((a,b)=>a+b,0) }
          }
        }
      })
      return next
    })
  }, [])

  const handleWeekUpload = useCallback(async (file: File) => {
    const rows = await readRows(file)
    const newRows: WeeklyRow[] = rows.map(r => ({
      weekLabel: String(r['Week'] ?? r['weekLabel'] ?? ''),
      families: Number(r['Families'] ?? r['families'] ?? 0),
      volume: Number(r['Volume'] ?? r['volume'] ?? 0),
      respaApps: Number(r['RESPA Apps'] ?? r['respaApps'] ?? 0),
      initialApps: Number(r['Initial Apps'] ?? r['initialApps'] ?? 0),
    })).filter(r => r.weekLabel)
    setWeeklyData(prev => {
      const labels = new Set(prev.map(w => w.weekLabel))
      return [...prev, ...newRows.filter(r => !labels.has(r.weekLabel))]
    })
  }, [])

  const tabOpts: Array<{ id: 'branch'|'apps'|'changemakers'; label: string }> = [
    { id: 'branch', label: 'Branch Production' },
    { id: 'apps', label: 'Applications' },
    { id: 'changemakers', label: 'Changemakers Trip' },
  ]

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.navy }}>Production Dashboard</div>
        <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>2026 FinFree Division · YTD through July 15</div>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: `2px solid ${C.border}`, marginBottom: 24 }}>
        {tabOpts.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 14, fontWeight: activeTab === t.id ? 700 : 400,
            color: activeTab === t.id ? C.navy : C.dim,
            borderBottom: `2px solid ${activeTab === t.id ? C.navy : 'transparent'}`,
            marginBottom: -2, transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'branch' && <BranchProductionTab maData={maData} onFundingsUpload={handleFundingsUpload} />}
      {activeTab === 'apps' && <ApplicationsTab maData={maData} weeklyData={weeklyData} onAppsUpload={handleAppsUpload} onWeekUpload={handleWeekUpload} />}
      {activeTab === 'changemakers' && <ChangemakersTab maData={maData} />}
    </div>
  )
}
