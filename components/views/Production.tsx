'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'

// ── Design tokens (matches rest of app) ───────────────────────────────────
const C = {
  bg:         '#F4F6F8',
  white:      '#fff',
  navy:       '#0A2540',
  border:     '#E4E8EC',
  borderSoft: '#DCE1E6',
  text:       '#26303B',
  muted:      '#858889',
  dim:        '#5C6570',
  accent:     '#5BCBF5',
  green:      '#16a34a',
  greenBg:    'rgba(34,197,94,0.08)',
  red:        '#dc2626',
  amber:      '#d97706',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul']

// ── Real YTD data parsed from CSV exports ─────────────────────────────────
// Source: FinFree YTD Fundings.csv, FinFree YTD Respa Apps.csv, FinFree YTD Initial Aps.csv
const MA_DATA = [
  { name:'Katrinka Condie',    ytdFamilies:58, ytdVolume:41832995, ytdRespaApps:63,  ytdInitialApps:90,  monthlyFamilies:[5,5,16,7,9,13,3],   monthlyVolume:[2699708,2526094,12053658,5666263,6676691,8167395,4043186], monthlyRespaApps:[7,15,8,6,7,15,5],   monthlyInitialApps:[35,32,16,2,1,4,0] },
  { name:'Justin Padron',      ytdFamilies:52, ytdVolume:34456944, ytdRespaApps:51,  ytdInitialApps:61,  monthlyFamilies:[11,5,5,9,10,8,4],   monthlyVolume:[4686842,2872015,4168096,6800626,5526631,5071814,5330920], monthlyRespaApps:[6,4,11,10,10,6,4],  monthlyInitialApps:[15,14,22,3,6,1,0] },
  { name:'Skyler Ford',        ytdFamilies:42, ytdVolume:20579512, ytdRespaApps:44,  ytdInitialApps:108, monthlyFamilies:[5,5,6,8,6,9,3],    monthlyVolume:[2640796,3095608,2637081,4393457,2184064,4316391,1312115], monthlyRespaApps:[6,5,7,9,8,4,5],    monthlyInitialApps:[36,26,40,3,1,2,0] },
  { name:'Jacky Vuong',        ytdFamilies:40, ytdVolume:18636248, ytdRespaApps:29,  ytdInitialApps:43,  monthlyFamilies:[3,3,12,7,8,5,2],   monthlyVolume:[2550334,885653,3359814,4130460,4114987,2929000,666000],   monthlyRespaApps:[3,5,4,9,5,3,0],    monthlyInitialApps:[8,12,17,3,2,1,0] },
  { name:'Gregory Allen',      ytdFamilies:38, ytdVolume:6629447,  ytdRespaApps:61,  ytdInitialApps:159, monthlyFamilies:[6,5,9,6,4,7,1],    monthlyVolume:[1070876,879683,2060016,723084,760147,1025670,109971],     monthlyRespaApps:[5,8,8,8,18,11,3],  monthlyInitialApps:[41,66,45,4,2,1,0] },
  { name:'Jason Drobeck',      ytdFamilies:36, ytdVolume:24556291, ytdRespaApps:51,  ytdInitialApps:82,  monthlyFamilies:[3,9,7,4,4,4,5],    monthlyVolume:[1190250,5819496,5016537,2183977,5287250,1874296,3184485], monthlyRespaApps:[12,6,7,9,6,7,4],   monthlyInitialApps:[30,27,20,3,1,1,0] },
  { name:'Drake Bloebaum',     ytdFamilies:36, ytdVolume:17801759, ytdRespaApps:56,  ytdInitialApps:101, monthlyFamilies:[5,3,6,6,4,10,2],   monthlyVolume:[1238182,1129020,4279148,3036050,1511050,5734309,874000],  monthlyRespaApps:[8,8,8,5,10,12,5],  monthlyInitialApps:[26,38,32,1,1,2,1] },
  { name:'Ross Zimmerman',     ytdFamilies:33, ytdVolume:16957257, ytdRespaApps:57,  ytdInitialApps:113, monthlyFamilies:[4,2,6,7,4,9,1],    monthlyVolume:[3224378,768000,2927940,3678830,2810661,3354753,192695],   monthlyRespaApps:[10,7,6,9,13,6,6],  monthlyInitialApps:[48,32,26,1,2,1,3] },
  { name:'Aaron Thomas',       ytdFamilies:29, ytdVolume:13804933, ytdRespaApps:44,  ytdInitialApps:74,  monthlyFamilies:[2,5,4,6,4,4,4],    monthlyVolume:[477350,1763950,2165373,4362040,1632155,1722600,1681465],  monthlyRespaApps:[6,9,11,7,8,3,0],   monthlyInitialApps:[18,25,29,1,0,1,0] },
  { name:'Kaytlin Collins',    ytdFamilies:22, ytdVolume:5432496,  ytdRespaApps:45,  ytdInitialApps:64,  monthlyFamilies:[1,4,3,5,3,3,3],    monthlyVolume:[308750,425333,1184679,1372807,774790,838000,528137],      monthlyRespaApps:[3,5,9,6,3,16,3],   monthlyInitialApps:[12,16,31,1,0,4,0] },
  { name:'Scott DiGregorio',   ytdFamilies:22, ytdVolume:10541726, ytdRespaApps:22,  ytdInitialApps:34,  monthlyFamilies:[3,5,0,5,4,5,0],    monthlyVolume:[1000000,1260443,0,2494609,1601500,4185174,0],             monthlyRespaApps:[5,2,3,4,4,2,2],    monthlyInitialApps:[11,10,12,1,0,0,0] },
  { name:'Edgardo Balentine',  ytdFamilies:21, ytdVolume:7856649,  ytdRespaApps:36,  ytdInitialApps:52,  monthlyFamilies:[2,2,5,3,4,4,1],    monthlyVolume:[795000,348616,1781326,858925,1971751,1881290,219741],     monthlyRespaApps:[4,5,4,4,6,5,8],    monthlyInitialApps:[13,20,18,1,0,0,0] },
  { name:'Michael Breen',      ytdFamilies:17, ytdVolume:8562801,  ytdRespaApps:20,  ytdInitialApps:30,  monthlyFamilies:[1,4,3,0,4,3,2],    monthlyVolume:[158000,1595012,2395342,0,1592704,1121743,1700000],        monthlyRespaApps:[5,2,2,6,4,1,0],    monthlyInitialApps:[9,12,8,1,0,0,0] },
  { name:'Michael Jones',      ytdFamilies:15, ytdVolume:6748235,  ytdRespaApps:29,  ytdInitialApps:134, monthlyFamilies:[4,4,0,1,2,4,0],    monthlyVolume:[1946862,1465882,0,524400,1482000,1329091,0],              monthlyRespaApps:[6,4,6,4,5,1,3],    monthlyInitialApps:[39,32,61,1,1,0,0] },
  { name:'Benjamin Kyle',      ytdFamilies:13, ytdVolume:6415893,  ytdRespaApps:15,  ytdInitialApps:83,  monthlyFamilies:[4,0,2,0,4,3,0],    monthlyVolume:[1765550,0,928650,0,2772050,949643,0],                     monthlyRespaApps:[1,1,1,3,7,2,0],    monthlyInitialApps:[16,43,22,2,0,0,0] },
  { name:'David Nelson',       ytdFamilies:11, ytdVolume:3728819,  ytdRespaApps:17,  ytdInitialApps:116, monthlyFamilies:[0,1,2,3,4,0,1],    monthlyVolume:[0,400500,398940,1915750,477379,0,536250],                 monthlyRespaApps:[1,2,5,2,3,2,2],    monthlyInitialApps:[32,29,54,1,0,0,0] },
  { name:'Matthew Smith',      ytdFamilies:23, ytdVolume:11769740, ytdRespaApps:37,  ytdInitialApps:135, monthlyFamilies:[1,5,6,6,3,2,0],    monthlyVolume:[832750,1336345,3304868,3045064,2299950,950763,0],         monthlyRespaApps:[5,7,8,8,2,6,1],    monthlyInitialApps:[28,41,62,3,0,0,1] },
  { name:'Anthony Alfonso Soto',ytdFamilies:5, ytdVolume:1475303,  ytdRespaApps:7,   ytdInitialApps:9,   monthlyFamilies:[0,0,1,2,1,0,1],    monthlyVolume:[0,0,424000,519816,282987,0,248500],                       monthlyRespaApps:[1,0,2,1,1,2,0],    monthlyInitialApps:[3,2,4,0,0,0,0] },
  { name:'Ashley Roberts',     ytdFamilies:5,  ytdVolume:1907773,  ytdRespaApps:9,   ytdInitialApps:6,   monthlyFamilies:[0,0,0,1,1,1,2],    monthlyVolume:[0,0,0,423200,236000,375000,873573],                       monthlyRespaApps:[0,0,1,2,3,3,0],    monthlyInitialApps:[0,3,3,0,0,0,0] },
  { name:'Ryan Todey',         ytdFamilies:3,  ytdVolume:1597186,  ytdRespaApps:1,   ytdInitialApps:3,   monthlyFamilies:[2,1,0,0,0,0,0],    monthlyVolume:[1340611,256575,0,0,0,0,0],                                monthlyRespaApps:[1,0,0,0,0,0,0],    monthlyInitialApps:[3,0,0,0,0,0,0] },
  { name:'Michael Madonna',    ytdFamilies:3,  ytdVolume:848955,   ytdRespaApps:8,   ytdInitialApps:11,  monthlyFamilies:[0,1,1,0,0,1,0],    monthlyVolume:[0,130000,644000,0,0,74955,0],                             monthlyRespaApps:[1,2,0,0,0,2,3],    monthlyInitialApps:[7,3,0,0,0,1,0] },
  { name:'Bryon Wensel',       ytdFamilies:2,  ytdVolume:487986,   ytdRespaApps:3,   ytdInitialApps:7,   monthlyFamilies:[1,0,0,0,1,0,0],    monthlyVolume:[187986,0,0,0,300000,0,0],                                 monthlyRespaApps:[1,0,0,1,0,0,1],    monthlyInitialApps:[0,1,6,0,0,0,0] },
  { name:'Joshua Mettle',      ytdFamilies:2,  ytdVolume:900500,   ytdRespaApps:3,   ytdInitialApps:3,   monthlyFamilies:[0,0,1,0,0,0,1],    monthlyVolume:[0,0,400500,0,0,0,500000],                                 monthlyRespaApps:[0,1,0,0,0,2,0],    monthlyInitialApps:[0,3,0,0,0,0,0] },
  { name:'Julie Jolivet',      ytdFamilies:1,  ytdVolume:193652,   ytdRespaApps:1,   ytdInitialApps:0,   monthlyFamilies:[0,0,0,0,0,1,0],    monthlyVolume:[0,0,0,0,0,193652,0],                                     monthlyRespaApps:[0,0,0,1,0,0,0],    monthlyInitialApps:[0,0,0,0,0,0,0] },
  { name:'Joel Davis',         ytdFamilies:1,  ytdVolume:346655,   ytdRespaApps:0,   ytdInitialApps:0,   monthlyFamilies:[1,0,0,0,0,0,0],    monthlyVolume:[346655,0,0,0,0,0,0],                                     monthlyRespaApps:[0,0,0,0,0,0,0],    monthlyInitialApps:[0,0,0,0,0,0,0] },
  { name:'Matthew McNally',    ytdFamilies:1,  ytdVolume:289060,   ytdRespaApps:0,   ytdInitialApps:4,   monthlyFamilies:[1,0,0,0,0,0,0],    monthlyVolume:[289060,0,0,0,0,0,0],                                     monthlyRespaApps:[0,0,0,0,0,0,0],    monthlyInitialApps:[1,1,2,0,0,0,0] },
  { name:'Torrence Williamson',ytdFamilies:1,  ytdVolume:310500,   ytdRespaApps:1,   ytdInitialApps:11,  monthlyFamilies:[0,0,1,0,0,0,0],    monthlyVolume:[0,0,310500,0,0,0,0],                                     monthlyRespaApps:[0,0,1,0,0,0,0],    monthlyInitialApps:[6,4,1,0,0,0,0] },
  { name:'Valerie Miller',     ytdFamilies:0,  ytdVolume:0,        ytdRespaApps:5,   ytdInitialApps:0,   monthlyFamilies:[0,0,0,0,0,0,0],    monthlyVolume:[0,0,0,0,0,0,0],                                          monthlyRespaApps:[0,0,0,0,2,3,0],    monthlyInitialApps:[0,0,0,0,0,0,0] },
]

// Team-level monthly totals (derived from MA_DATA)
const TEAM_MONTHLY_FAMILIES  = MONTHS.map((_, i) => MA_DATA.reduce((s,m) => s + m.monthlyFamilies[i], 0))
const TEAM_MONTHLY_VOLUME    = MONTHS.map((_, i) => MA_DATA.reduce((s,m) => s + m.monthlyVolume[i], 0))
const TEAM_MONTHLY_RESPA     = MONTHS.map((_, i) => MA_DATA.reduce((s,m) => s + m.monthlyRespaApps[i], 0))
const TEAM_MONTHLY_INITIAL   = MONTHS.map((_, i) => MA_DATA.reduce((s,m) => s + m.monthlyInitialApps[i], 0))

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtM(n: number) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n
}
function pctCh(cur: number, prev: number) {
  return prev ? ((cur - prev) / prev) * 100 : null
}
function DeltaBadge({ cur, prev }: { cur: number; prev: number }) {
  const p = pctCh(cur, prev)
  if (p === null) return null
  const up = p > 0.5, dn = p < -0.5
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:11, fontWeight:700, fontFamily:'Consolas,monospace', background: up?'rgba(34,197,94,0.1)':dn?'rgba(220,38,38,0.07)':'#F4F6F8', color: up?C.green:dn?C.red:C.muted, borderRadius:5, padding:'2px 7px', marginLeft:4 }}>
      {up?'▲':dn?'▼':'—'} {Math.abs(p).toFixed(0)}%
    </span>
  )
}

const SUB_TABS = [{ id:'branch', label:'Branch Production' }, { id:'apps', label:'Applications' }] as const
type SubTab = typeof SUB_TABS[number]['id']

// ── UI atoms ───────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', marginBottom:20, ...style }}>{children}</div>
}
function CardHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding:'14px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
      <div style={{ fontWeight:700, fontSize:14, color:C.navy }}>{title}</div>
      {right}
    </div>
  )
}
function ToggleGroup<T extends string>({ options, value, onChange }: { options:{id:T;label:string}[]; value:T; onChange:(v:T)=>void }) {
  return (
    <div style={{ display:'flex', background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:2, gap:2 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)} style={{ padding:'5px 14px', fontSize:12, fontWeight:600, borderRadius:6, cursor:'pointer', border:'none', background: value===o.id?C.white:'transparent', color: value===o.id?C.navy:C.muted, boxShadow: value===o.id?'0 1px 3px rgba(0,0,0,0.08)':'none', transition:'all .12s' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
function MiniBarChart({ values, labels, color, fmt }: { values:number[]; labels:string[]; color:string; fmt:(n:number)=>string }) {
  const max = Math.max(...values) || 1
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:100 }}>
      {values.map((v, i) => {
        const h = Math.max(Math.round((v/max)*82), v>0?4:0)
        const isCur = i === values.length-1
        const isPeak = v === max && v > 0
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end' }}>
            <div style={{ fontSize:9, fontFamily:'Consolas,monospace', color: isCur||isPeak?color:'transparent', marginBottom:2 }}>{fmt(v)}</div>
            <div style={{ width:'100%', height:h, background:color, borderRadius:'3px 3px 0 0', opacity: isCur?1:isPeak?0.7:0.35 }} />
            <div style={{ fontSize:9, color:C.muted, marginTop:4, writingMode:'vertical-rl', transform:'rotate(180deg)', height:34, overflow:'hidden', whiteSpace:'nowrap' }}>{labels[i]}</div>
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// BRANCH PRODUCTION
// ══════════════════════════════════════════════════════════════════════════
type BranchMetric = 'volume'|'families'|'respaApps'|'initialApps'
type BranchPeriod = 'ytd'|'1'|'2'|'3'|'4'|'5'|'6'|'7'

function BranchProduction() {
  const [metric, setMetric] = useState<BranchMetric>('volume')
  const [period, setPeriod] = useState<BranchPeriod>('ytd')
  const [search, setSearch] = useState('')

  function getValue(ma: typeof MA_DATA[0]) {
    const mi = period === 'ytd' ? -1 : parseInt(period) - 1
    if (metric === 'volume')       return mi < 0 ? ma.ytdVolume       : ma.monthlyVolume[mi]
    if (metric === 'families')     return mi < 0 ? ma.ytdFamilies     : ma.monthlyFamilies[mi]
    if (metric === 'respaApps')    return mi < 0 ? ma.ytdRespaApps    : ma.monthlyRespaApps[mi]
    return                                mi < 0 ? ma.ytdInitialApps  : ma.monthlyInitialApps[mi]
  }

  const sorted = MA_DATA
    .filter(m => getValue(m) > 0 && m.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => getValue(b) - getValue(a))

  const maxVal = sorted[0] ? getValue(sorted[0]) : 1
  const medals = ['🥇','🥈','🥉']

  const totalFam = MA_DATA.reduce((s,m) => s + (period==='ytd'?m.ytdFamilies:m.monthlyFamilies[parseInt(period)-1]),0)
  const totalVol = MA_DATA.reduce((s,m) => s + (period==='ytd'?m.ytdVolume:m.monthlyVolume[parseInt(period)-1]),0)
  const totalRA  = MA_DATA.reduce((s,m) => s + (period==='ytd'?m.ytdRespaApps:m.monthlyRespaApps[parseInt(period)-1]),0)
  const totalIA  = MA_DATA.reduce((s,m) => s + (period==='ytd'?m.ytdInitialApps:m.monthlyInitialApps[parseInt(period)-1]),0)

  const periodLabel = period === 'ytd' ? 'Year to Date' : `${MONTHS[parseInt(period)-1]} 2026`

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <ToggleGroup
          options={[{id:'volume',label:'Volume'},{id:'families',label:'Families'},{id:'respaApps',label:'RESPA Apps'},{id:'initialApps',label:'Initial Apps'}]}
          value={metric} onChange={setMetric}
        />
        <ToggleGroup
          options={[{id:'ytd',label:'YTD'},{id:'1',label:'Jan'},{id:'2',label:'Feb'},{id:'3',label:'Mar'},{id:'4',label:'Apr'},{id:'5',label:'May'},{id:'6',label:'Jun'},{id:'7',label:'Jul'}]}
          value={period} onChange={setPeriod}
        />
      </div>

      {/* KPI tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginBottom:22 }}>
        {[
          { label:'Families Funded', value:totalFam, fmt:String,   accent:'#5BCBF5' },
          { label:'Total Volume',    value:totalVol, fmt:fmtM,     accent:'#5BCBF5' },
          { label:'RESPA Apps',      value:totalRA,  fmt:String,   accent:'#a78bfa' },
          { label:'Initial Apps',    value:totalIA,  fmt:String,   accent:'#f0b429' },
        ].map(t => (
          <div key={t.label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:t.accent }} />
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, marginBottom:6 }}>{t.label}</div>
            <div style={{ fontWeight:800, fontSize:28, color:C.navy, lineHeight:1 }}>{t.fmt(t.value)}</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{periodLabel}</div>
          </div>
        ))}
      </div>

      {/* Team trend charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:0 }}>
        <Card style={{ marginBottom:20 }}>
          <CardHead title="Monthly Families Funded — Team" />
          <div style={{ padding:'16px 20px' }}>
            <MiniBarChart values={TEAM_MONTHLY_FAMILIES} labels={MONTHS} color={C.accent} fmt={String} />
          </div>
        </Card>
        <Card style={{ marginBottom:20 }}>
          <CardHead title="Monthly Volume — Team" />
          <div style={{ padding:'16px 20px' }}>
            <MiniBarChart values={TEAM_MONTHLY_VOLUME} labels={MONTHS} color={C.accent} fmt={fmtM} />
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHead
          title="Leaderboard"
          right={
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search LO…"
                style={{ padding:'6px 11px', border:`1px solid ${C.borderSoft}`, borderRadius:7, fontSize:12, background:C.bg, color:C.text, width:140 }}
              />
              <span style={{ fontSize:12, color:C.muted }}>{sorted.length} LOs · {periodLabel}</span>
            </div>
          }
        />
        <div>
          {sorted.length === 0 && <div style={{ padding:32, textAlign:'center', color:C.muted }}>No data for this period.</div>}
          {sorted.map((ma, i) => {
            const val = getValue(ma)
            const pct = (val / maxVal * 100).toFixed(1)
            const display = metric === 'volume' ? fmtM(val) : String(val)
            const barColor = i===0?C.accent:i===1?C.navy:i===2?'#4BC8F2':'#0A2540'
            const barOpacity = i===0?1:i===1?0.6:i===2?0.45:0.3
            return (
              <div key={ma.name} style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 20px', borderBottom:`1px solid ${C.border}`, background: i===0?'#F0FAFB':undefined, transition:'background .1s' }}>
                <div style={{ width:28, textAlign:'center', fontSize:'1rem', flexShrink:0 }}>
                  {i<3 ? medals[i] : <span style={{ fontWeight:700, color:C.muted, fontSize:13 }}>{i+1}</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:C.navy }}>{ma.name}</span>
                    <span style={{ fontSize:11, color:C.muted }}>
                      {metric!=='families'  && `${ma.ytdFamilies} funded`}
                      {metric==='volume'    && ` · ${fmtM(ma.ytdVolume)}`}
                    </span>
                  </div>
                  <div style={{ height:5, background:C.bg, borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background:barColor, opacity:barOpacity, borderRadius:3 }} />
                  </div>
                </div>
                <div style={{ fontFamily:'Consolas,monospace', fontSize:14, fontWeight:700, color: i===0?C.navy:C.text, whiteSpace:'nowrap', minWidth:80, textAlign:'right' }}>
                  {display}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* MA detail table */}
      <Card>
        <CardHead title="LO Detail — All Metrics" right={<span style={{ fontSize:12, color:C.muted }}>YTD 2026</span>} />
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {['Rank','Loan Officer','Fam Funded','Volume','RESPA Apps','Initial Apps','App→Fund %'].map((h,i) => (
                  <th key={h} style={{ fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, padding:'9px 14px', textAlign:i===1?'left':'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...MA_DATA].sort((a,b)=>b.ytdFamilies-a.ytdFamilies).filter(m=>m.ytdFamilies>0||m.ytdRespaApps>0).map((ma, i) => {
                const conv = ma.ytdRespaApps > 0 ? (ma.ytdFamilies/ma.ytdRespaApps*100).toFixed(0)+'%' : '—'
                return (
                  <tr key={ma.name} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===1?'#FAFBFC':C.white }}>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:12, color:C.muted }}>{i+1}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:C.navy, fontSize:13 }}>{ma.name}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13 }}>{ma.ytdFamilies}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, fontWeight:700, color:C.navy }}>{fmtM(ma.ytdVolume)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13 }}>{ma.ytdRespaApps}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13 }}>{ma.ytdInitialApps}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, color: parseFloat(conv)>=50?C.green:parseFloat(conv)>=30?C.amber:C.red }}>{conv}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// APPLICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════
interface WeeklyRow { id:string; weekLabel:string; weekStart:string; totalFamilies:number; totalVolume:number; sgFamilies:number; blFamilies:number; totalApps:number; sgApps:number; blApps:number }

const SEED_WEEKLY: WeeklyRow[] = [
  { id:'w1', weekLabel:'May 9–15',     weekStart:'2026-05-09', totalFamilies:31, totalVolume:17932399, sgFamilies:21, blFamilies:10, totalApps:132, sgApps:50,  blApps:82 },
  { id:'w2', weekLabel:'May 16–22',    weekStart:'2026-05-16', totalFamilies:24, totalVolume:11021334, sgFamilies:16, blFamilies:8,  totalApps:121, sgApps:43,  blApps:78 },
  { id:'w3', weekLabel:'May 23–29',    weekStart:'2026-05-23', totalFamilies:28, totalVolume:14261312, sgFamilies:20, blFamilies:8,  totalApps:87,  sgApps:39,  blApps:48 },
  { id:'w4', weekLabel:'May 30–Jun 5', weekStart:'2026-05-30', totalFamilies:32, totalVolume:19037937, sgFamilies:27, blFamilies:5,  totalApps:78,  sgApps:42,  blApps:36 },
  { id:'w5', weekLabel:'Jun 6–12',     weekStart:'2026-06-06', totalFamilies:26, totalVolume:16585994, sgFamilies:20, blFamilies:6,  totalApps:81,  sgApps:38,  blApps:43 },
  { id:'w6', weekLabel:'Jun 13–19',    weekStart:'2026-06-13', totalFamilies:19, totalVolume:13505427, sgFamilies:18, blFamilies:1,  totalApps:81,  sgApps:39,  blApps:42 },
  { id:'w7', weekLabel:'Jun 20–26',    weekStart:'2026-06-20', totalFamilies:14, totalVolume:4874589,  sgFamilies:9,  blFamilies:5,  totalApps:68,  sgApps:33,  blApps:35 },
  { id:'w8', weekLabel:'Jun 27–Jul 3', weekStart:'2026-06-27', totalFamilies:27, totalVolume:12290220, sgFamilies:20, blFamilies:7,  totalApps:81,  sgApps:42,  blApps:39 },
  { id:'w9', weekLabel:'Jul 4–10',     weekStart:'2026-07-04', totalFamilies:15, totalVolume:8342088,  sgFamilies:14, blFamilies:1,  totalApps:60,  sgApps:45,  blApps:15 },
]

function ApplicationsTab({ weeks, onUpload, uploading, uploadMsg }: { weeks:WeeklyRow[]; onUpload:(f:File)=>void; uploading:boolean; uploadMsg:string }) {
  const [view, setView] = useState<'weekly'|'roll4'|'ytd'>('weekly')
  const [appView, setAppView] = useState<'weekly'|'monthly'>('weekly')
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = [...weeks].sort((a,b) => a.weekStart.localeCompare(b.weekStart))
  const cur  = sorted[sorted.length-1]
  const prev = sorted[sorted.length-2]

  type Agg = Omit<WeeklyRow,'id'|'weekLabel'|'weekStart'>
  function agg(arr: WeeklyRow[]): Agg {
    return arr.reduce((acc,w) => ({ totalFamilies:acc.totalFamilies+w.totalFamilies, totalVolume:acc.totalVolume+w.totalVolume, sgFamilies:acc.sgFamilies+w.sgFamilies, blFamilies:acc.blFamilies+w.blFamilies, totalApps:acc.totalApps+w.totalApps, sgApps:acc.sgApps+w.sgApps, blApps:acc.blApps+w.blApps }),
      { totalFamilies:0, totalVolume:0, sgFamilies:0, blFamilies:0, totalApps:0, sgApps:0, blApps:0 })
  }
  const display  = view==='weekly' ? cur  : view==='roll4' ? agg(sorted.slice(-4))  : agg(sorted)
  const prevDisp = view==='weekly' ? prev : view==='roll4' ? agg(sorted.slice(-8,-4)) : null

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <ToggleGroup
          options={[{id:'weekly',label:'Weekly'},{id:'roll4',label:'4-Wk Rolling'},{id:'ytd',label:'YTD'}]}
          value={view} onChange={setView}
        />
        <ToggleGroup
          options={[{id:'weekly',label:'Weekly Trends'},{id:'monthly',label:'Monthly (CSV)'}]}
          value={appView} onChange={setAppView}
        />
      </div>

      {/* KPI tiles */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginBottom:22 }}>
        {[
          { label:'RESPA Families', value:display?.totalFamilies??0, prev:prevDisp?.totalFamilies, accent:C.accent,   fmt:String },
          { label:'Funded Volume',  value:display?.totalVolume??0,   prev:prevDisp?.totalVolume,   accent:C.accent,   fmt:fmtM   },
          { label:'Initial Apps',   value:display?.totalApps??0,     prev:prevDisp?.totalApps,     accent:'#a78bfa',  fmt:String },
          { label:'Self Gen Apps',  value:display?.sgApps??0,        prev:prevDisp?.sgApps,        accent:'#f0b429',  fmt:String },
        ].map(t => (
          <div key={t.label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:t.accent }} />
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, marginBottom:6 }}>{t.label}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, flexWrap:'wrap' }}>
              <div style={{ fontWeight:800, fontSize:28, color:C.navy, lineHeight:1 }}>{t.fmt(t.value)}</div>
              {prevDisp!=null && t.prev!=null && <DeltaBadge cur={t.value} prev={t.prev} />}
            </div>
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
              {view==='weekly' ? cur?.weekLabel : view==='roll4' ? 'Last 4 weeks' : 'YTD'}
            </div>
          </div>
        ))}
      </div>

      {appView === 'weekly' ? (
        <>
          {/* WoW */}
          {view==='weekly' && prev && (
            <Card>
              <CardHead title="Week-over-Week Comparison" right={<span style={{ fontSize:12, color:C.muted }}>{prev.weekLabel} → {cur.weekLabel}</span>} />
              <div style={{ padding:'14px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {([
                  ['Total Families', prev.totalFamilies, cur.totalFamilies, (n:number)=>n+' fam'],
                  ['Volume', prev.totalVolume, cur.totalVolume, fmtM],
                  ['Self Gen Fam', prev.sgFamilies, cur.sgFamilies, (n:number)=>n+' fam'],
                  ['Better Leads Fam', prev.blFamilies, cur.blFamilies, (n:number)=>n+' fam'],
                  ['Initial Apps', prev.totalApps, cur.totalApps, (n:number)=>n+' apps'],
                  ['SG Apps', prev.sgApps, cur.sgApps, (n:number)=>n+' apps'],
                  ['BL Apps', prev.blApps, cur.blApps, (n:number)=>n+' apps'],
                ] as [string,number,number,(n:number)=>string][]).map(([label,pv,cv,fmt]) => {
                  const p=pctCh(cv,pv); const up=p!==null&&p>0.5; const dn=p!==null&&p<-0.5
                  return (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:12, color:C.muted }}>{label}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:C.muted, fontFamily:'Consolas,monospace' }}>{fmt(pv)}</span>
                        <span style={{ color:C.border }}>→</span>
                        <span style={{ fontFamily:'Consolas,monospace', fontSize:13, fontWeight:700, color:up?C.green:dn?C.red:C.navy }}>{fmt(cv)}</span>
                        {p!==null && <DeltaBadge cur={cv} prev={pv} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Weekly charts */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <Card style={{ marginBottom:20 }}>
              <CardHead title="Weekly RESPA Families" />
              <div style={{ padding:'16px 20px' }}>
                <MiniBarChart values={sorted.map(w=>w.totalFamilies)} labels={sorted.map(w=>w.weekLabel.split('–')[0])} color={C.accent} fmt={String} />
              </div>
            </Card>
            <Card style={{ marginBottom:20 }}>
              <CardHead title="Weekly Initial Apps" />
              <div style={{ padding:'16px 20px' }}>
                <MiniBarChart values={sorted.map(w=>w.totalApps)} labels={sorted.map(w=>w.weekLabel.split('–')[0])} color="#a78bfa" fmt={String} />
              </div>
            </Card>
          </div>

          {/* Weekly history table */}
          <Card>
            <CardHead title="Weekly History" right={<span style={{ fontSize:12, color:C.muted }}>{sorted.length} weeks · newest first</span>} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    {['Week','Families','Volume','SG Fam','BL Fam','Apps','SG Apps','BL Apps','WoW Fam','WoW Apps'].map((h,i) => (
                      <th key={h} style={{ fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, padding:'9px 14px', textAlign:i===0?'left':'right', borderBottom:`1px solid ${C.border}`, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...sorted].reverse().map((w,ri) => {
                    const oi = sorted.length-1-ri; const pw = oi>0?sorted[oi-1]:null; const isCur=ri===0
                    return (
                      <tr key={w.id} style={{ borderBottom:`1px solid ${C.border}`, background: isCur?'#F0FAFB':ri%2===1?'#FAFBFC':C.white }}>
                        <td style={{ padding:'10px 14px', fontWeight:isCur?700:500, color:C.navy, fontSize:13, whiteSpace:'nowrap' }}>{isCur?'★ ':''}{w.weekLabel}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, fontWeight:isCur?700:400, color:C.text }}>{w.totalFamilies}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, color:C.dim }}>{fmtM(w.totalVolume)}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, color:C.dim }}>{w.sgFamilies}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, color:C.dim }}>{w.blFamilies}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, fontWeight:isCur?700:400, color:C.text }}>{w.totalApps}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, color:C.dim }}>{w.sgApps}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, color:C.dim }}>{w.blApps}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontSize:11 }}>{pw?<DeltaBadge cur={w.totalFamilies} prev={pw.totalFamilies} />:<span style={{ color:C.muted }}>—</span>}</td>
                        <td style={{ padding:'10px 14px', textAlign:'right', fontSize:11 }}>{pw?<DeltaBadge cur={w.totalApps} prev={pw.totalApps} />:<span style={{ color:C.muted }}>—</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Upload */}
          <Card>
            <CardHead title="Upload Weekly Data" right={<span style={{ fontSize:12, color:C.muted }}>Week label = dedup key</span>} />
            <div style={{ padding:'20px 24px' }}>
              {uploadMsg && <div style={{ marginBottom:16, padding:'10px 14px', background: uploadMsg.startsWith('✅')?C.greenBg:'rgba(220,38,38,0.07)', border:`1px solid ${uploadMsg.startsWith('✅')?'#bbf7d0':'#fecaca'}`, borderRadius:8, fontSize:13, color:C.navy }}>{uploadMsg}</div>}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                <div style={{ border:`2px dashed ${uploading?C.accent:C.borderSoft}`, borderRadius:10, padding:28, textAlign:'center', cursor:'pointer', background:uploading?'#F0FAFB':C.bg }}
                     onClick={() => fileRef.current?.click()}
                     onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor=C.accent}}
                     onDragLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSoft}}
                     onDrop={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor=C.borderSoft;const f=e.dataTransfer.files[0];if(f)onUpload(f)}}>
                  <div style={{ fontSize:'2rem', marginBottom:8 }}>{uploading?'⏳':'📅'}</div>
                  <div style={{ fontWeight:700, fontSize:14, color:C.navy, marginBottom:4 }}>{uploading?'Processing…':'Drop Excel file here'}</div>
                  <div style={{ fontSize:12, color:C.muted }}>or click to browse · .xlsx / .xls</div>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)onUpload(f)}} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, marginBottom:10 }}>Format — Row 1 is header</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead><tr style={{ background:C.bg }}>{['A·Week','B·Fam','C·Vol','D·SGFam','E·BLFam','F·Apps','G·SGApps','H·BLApps'].map(h=><th key={h} style={{ padding:'6px 8px', textAlign:'left', borderBottom:`1px solid ${C.border}`, color:C.muted, fontWeight:600, fontSize:10, whiteSpace:'nowrap' }}>{h}</th>)}</tr></thead>
                    <tbody><tr>{['Jul 11–17','22','11000000','17','5','75','50','25'].map((v,i)=><td key={i} style={{ padding:'6px 8px', fontFamily:'Consolas,monospace', color:C.dim, borderBottom:`1px solid ${C.border}`, fontSize:11 }}>{v}</td>)}</tr></tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* Monthly CSV view */
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <Card style={{ marginBottom:20 }}>
              <CardHead title="Monthly RESPA Apps — Team" />
              <div style={{ padding:'16px 20px' }}>
                <MiniBarChart values={TEAM_MONTHLY_RESPA} labels={MONTHS} color="#a78bfa" fmt={String} />
              </div>
            </Card>
            <Card style={{ marginBottom:20 }}>
              <CardHead title="Monthly Initial Apps — Team" />
              <div style={{ padding:'16px 20px' }}>
                <MiniBarChart values={TEAM_MONTHLY_INITIAL} labels={MONTHS} color="#f0b429" fmt={String} />
              </div>
            </Card>
          </div>
          <Card>
            <CardHead title="Apps by LO — Monthly Breakdown" right={<span style={{ fontSize:12, color:C.muted }}>From CSV export · YTD 2026</span>} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                <thead>
                  <tr style={{ background:C.bg }}>
                    <th style={{ fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, padding:'9px 14px', textAlign:'left', borderBottom:`1px solid ${C.border}` }}>Loan Officer</th>
                    {MONTHS.map(m=><th key={m} style={{ fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, padding:'9px 10px', textAlign:'right', borderBottom:`1px solid ${C.border}` }}>{m}</th>)}
                    <th style={{ fontSize:10, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', color:C.muted, padding:'9px 14px', textAlign:'right', borderBottom:`1px solid ${C.border}` }}>YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {[...MA_DATA].filter(m=>m.ytdRespaApps>0).sort((a,b)=>b.ytdRespaApps-a.ytdRespaApps).map((ma,i) => (
                    <tr key={ma.name} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===1?'#FAFBFC':C.white }}>
                      <td style={{ padding:'9px 14px', fontWeight:600, color:C.navy, fontSize:13 }}>{ma.name}</td>
                      {ma.monthlyRespaApps.map((v,mi)=>{
                        const isPeak = v>0 && v===Math.max(...ma.monthlyRespaApps)
                        return <td key={mi} style={{ padding:'9px 10px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:12, color: isPeak?C.green:C.text, fontWeight: isPeak?700:400, background: isPeak?C.greenBg:undefined }}>{v||'—'}</td>
                      })}
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, fontWeight:700, color:C.navy }}>{ma.ytdRespaApps}</td>
                    </tr>
                  ))}
                  <tr style={{ background:C.bg, borderTop:`2px solid ${C.border}` }}>
                    <td style={{ padding:'9px 14px', fontWeight:700, color:C.navy, fontSize:12 }}>TEAM TOTAL</td>
                    {TEAM_MONTHLY_RESPA.map((v,i)=><td key={i} style={{ padding:'9px 10px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:12, fontWeight:700, color:C.navy }}>{v}</td>)}
                    <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'Consolas,monospace', fontSize:13, fontWeight:700, color:C.navy }}>{MA_DATA.reduce((s,m)=>s+m.ytdRespaApps,0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════
export default function Production() {
  const [activeTab, setActiveTab] = useState<SubTab>('branch')
  const [weeklyApps, setWeeklyApps] = useState<WeeklyRow[]>(SEED_WEEKLY)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  async function handleAppsUpload(file: File) {
    setUploading(true); setUploadMsg('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type:'array' })
      const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header:1, defval:'' })
      const existingLabels = new Set(weeklyApps.map(w=>w.weekLabel))
      const newW: WeeklyRow[] = []; let dups=0
      rows.slice(1).forEach((row,i)=>{
        const label=String(row[0]).trim(); if(!label)return
        if(existingLabels.has(label)){dups++;return}
        newW.push({ id:`u-${Date.now()}-${i}`, weekLabel:label, weekStart:'', totalFamilies:+row[1]||0, totalVolume:parseFloat(String(row[2]).replace(/[^0-9.]/g,''))||0, sgFamilies:+row[3]||0, blFamilies:+row[4]||0, totalApps:+row[5]||0, sgApps:+row[6]||0, blApps:+row[7]||0 })
      })
      setWeeklyApps(prev=>[...prev,...newW])
      setUploadMsg(`✅ Imported ${newW.length} week(s)${dups?`, ${dups} duplicate(s) skipped`:''}`)
    } catch { setUploadMsg('❌ Error reading file') }
    setUploading(false)
  }

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'36px 40px 90px' }}>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ fontWeight:800, letterSpacing:'-.02em', fontSize:32, margin:0, color:C.navy }}>Production</h1>
        <div style={{ fontSize:14, color:C.muted, marginTop:5 }}>
          FinFree Division · 2026 YTD — {MA_DATA.reduce((s,m)=>s+m.ytdFamilies,0)} families · {fmtM(MA_DATA.reduce((s,m)=>s+m.ytdVolume,0))} funded · {MA_DATA.reduce((s,m)=>s+m.ytdRespaApps,0)} RESPA apps
        </div>
      </div>

      <div style={{ display:'flex', borderBottom:`2px solid ${C.border}`, marginBottom:28 }}>
        {SUB_TABS.map(tab => (
          <button key={tab.id} onClick={()=>{setActiveTab(tab.id);setUploadMsg('')}} style={{ padding:'10px 22px', fontSize:13, fontWeight:700, cursor:'pointer', border:'none', background:'none', color: activeTab===tab.id?C.navy:C.muted, borderBottom:`2px solid ${activeTab===tab.id?C.accent:'transparent'}`, marginBottom:-2, transition:'color .12s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab==='branch' && <BranchProduction />}
      {activeTab==='apps'   && <ApplicationsTab weeks={weeklyApps} onUpload={handleAppsUpload} uploading={uploading} uploadMsg={uploadMsg} />}
    </div>
  )
}
