'use client'
import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

// ── Design tokens ─────────────────────────────────────────────────────────
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

const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_IDX: Record<string,number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 }

// ── Types ─────────────────────────────────────────────────────────────────
interface MARecord {
  name: string
  ytdFamilies: number; ytdVolume: number; ytdRespaApps: number; ytdInitialApps: number
  monthlyFamilies: number[]; monthlyVolume: number[]
  monthlyRespaApps: number[]; monthlyInitialApps: number[]
}

interface WeeklyRow {
  id: string; weekLabel: string; weekStart: string
  totalFamilies: number; totalVolume: number
  sgFamilies: number; blFamilies: number
  totalApps: number; sgApps: number; blApps: number
}

// ── Seed data (parsed from YTD CSVs, Jan–Jul 2026) ───────────────────────
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

// ── CSV parsing ────────────────────────────────────────────────────────────
function parseDate(raw: string): { year:number; month:number }|null {
  if (!raw) return null
  const s = String(raw).trim()
  let m: RegExpMatchArray|null
  if ((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) return { year:+m[3], month:+m[1]-1 }
  if ((m=s.match(/^(\d{4})-(\d{2})-(\d{2})/)))        return { year:+m[1], month:+m[2]-1 }
  const n=Number(s)
  if (!isNaN(n)&&n>40000) { const d=new Date((n-25569)*86400000); return { year:d.getUTCFullYear(), month:d.getUTCMonth() } }
  if ((m=s.match(/([A-Za-z]{3})\s+\d+,?\s+(\d{4})/))) { const mi=MONTH_IDX[m[1].toLowerCase()]; return mi!==undefined?{year:+m[2],month:mi}:null }
  return null
}

function colVal(row: Record<string,unknown>, ...keys: string[]): string {
  for (const k of keys) {
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase()===k.toLowerCase()) { const v=row[rk]; if(v!=null&&String(v).trim()) return String(v).trim() }
    }
  }
  return ''
}

function emptyMA(name:string): MARecord {
  return { name, ytdFamilies:0, ytdVolume:0, ytdRespaApps:0, ytdInitialApps:0, monthlyFamilies:new Array(12).fill(0), monthlyVolume:new Array(12).fill(0), monthlyRespaApps:new Array(12).fill(0), monthlyInitialApps:new Array(12).fill(0) }
}

function parseFundingsRows(rows: Record<string,unknown>[]): MARecord[] {
  const map=new Map<string,MARecord>(); const seen=new Set<string>()
  for (const row of rows) {
    const id  = colVal(row,'loanfileid','loanFileId')
    const lo  = colVal(row,'assigned lc','assignedlc')
    const amt = parseFloat(String(colVal(row,'loan amount','loanamount')||'0').replace(/[^0-9.]/g,''))||0
    const dr  = colVal(row,'actual funding date','actual funding Date','funding date')
    if (!lo||!dr) continue
    const pd=parseDate(dr); if(!pd||pd.year!==2026) continue
    const key=id||`${lo}|${dr}|${amt}`
    if(seen.has(key)) continue; seen.add(key)
    if(!map.has(lo)) map.set(lo,emptyMA(lo))
    const ma=map.get(lo)!
    ma.monthlyFamilies[pd.month]++
    ma.monthlyVolume[pd.month]+=amt
  }
  map.forEach(ma=>{ ma.ytdFamilies=ma.monthlyFamilies.reduce((a,b)=>a+b,0); ma.ytdVolume=ma.monthlyVolume.reduce((a,b)=>a+b,0) })
  return [...map.values()].sort((a,b)=>b.ytdVolume-a.ytdVolume)
}

function parseAppsRows(rows: Record<string,unknown>[]): Map<string,number[]> {
  const map=new Map<string,number[]>(); const seen=new Set<string>()
  for (const row of rows) {
    const id = colVal(row,'loanfileid','loanFileId')
    const lo = colVal(row,'assigned lc','assignedlc')
    const dr = colVal(row,'application created at','loan file created at')
    if(!lo||!dr) continue
    const pd=parseDate(dr); if(!pd||pd.year!==2026) continue
    const key=id||`${lo}|${dr}`
    if(seen.has(key)) continue; seen.add(key)
    if(!map.has(lo)) map.set(lo,new Array(12).fill(0))
    map.get(lo)![pd.month]++
  }
  return map
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtM(n:number) {
  if(n>=1e9) return '$'+(n/1e9).toFixed(2)+'B'
  if(n>=1e6) return '$'+(n/1e6).toFixed(1)+'M'
  if(n>=1e3) return '$'+(n/1e3).toFixed(0)+'K'
  return '$'+n
}
function pctCh(cur:number,prev:number){ return prev?((cur-prev)/prev)*100:null }
function DeltaBadge({cur,prev}:{cur:number;prev:number}) {
  const p=pctCh(cur,prev); if(p===null) return null
  const up=p>0.5,dn=p<-0.5
  return <span style={{ display:'inline-flex',alignItems:'center',gap:2,fontSize:11,fontWeight:700,fontFamily:'Consolas,monospace',background:up?'rgba(34,197,94,0.1)':dn?'rgba(220,38,38,0.07)':'#F4F6F8',color:up?C.green:dn?C.red:C.muted,borderRadius:5,padding:'2px 7px',marginLeft:4 }}>{up?'▲':dn?'▼':'—'} {Math.abs(p).toFixed(0)}%</span>
}
function Card({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) {
  return <div style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden',marginBottom:20,...style }}>{children}</div>
}
function CardHead({title,right}:{title:string;right?:React.ReactNode}) {
  return <div style={{ padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}><div style={{ fontWeight:700,fontSize:14,color:C.navy }}>{title}</div>{right}</div>
}
function ToggleGroup<T extends string>({options,value,onChange}:{options:{id:T;label:string}[];value:T;onChange:(v:T)=>void}) {
  return (
    <div style={{ display:'flex',background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:2,gap:2,flexWrap:'wrap' }}>
      {options.map(o=>(
        <button key={o.id} onClick={()=>onChange(o.id)} style={{ padding:'5px 12px',fontSize:12,fontWeight:600,borderRadius:6,cursor:'pointer',border:'none',background:value===o.id?C.white:'transparent',color:value===o.id?C.navy:C.muted,boxShadow:value===o.id?'0 1px 3px rgba(0,0,0,0.08)':'none',transition:'all .12s',whiteSpace:'nowrap' }}>{o.label}</button>
      ))}
    </div>
  )
}
function MiniBarChart({values,labels,color,fmt}:{values:number[];labels:string[];color:string;fmt:(n:number)=>string}) {
  const max=Math.max(...values)||1
  return (
    <div style={{ display:'flex',alignItems:'flex-end',gap:5,height:110 }}>
      {values.map((v,i)=>{ const h=Math.max(Math.round((v/max)*86),v>0?4:0),isPeak=v===max&&v>0; return (
        <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end' }}>
          <div style={{ fontSize:9,fontFamily:'Consolas,monospace',color:isPeak?color:'transparent',marginBottom:2,whiteSpace:'nowrap' }}>{fmt(v)}</div>
          <div style={{ width:'100%',height:h,background:color,borderRadius:'3px 3px 0 0',opacity:isPeak?1:0.4 }} />
          <div style={{ fontSize:9,color:C.muted,marginTop:4 }}>{labels[i]}</div>
        </div>
      )})}
    </div>
  )
}

// ── Range selector ─────────────────────────────────────────────────────────
function RangeSelector({from,to,onChange}:{from:number;to:number;onChange:(f:number,t:number)=>void}) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',padding:'10px 0' }}>
      <span style={{ fontSize:12,color:C.muted,fontWeight:600 }}>From</span>
      <select value={from} onChange={e=>onChange(+e.target.value,Math.max(+e.target.value,to))}
        style={{ padding:'5px 10px',border:`1px solid ${C.borderSoft}`,borderRadius:7,fontSize:12,background:C.white,color:C.text }}>
        {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
      </select>
      <span style={{ fontSize:12,color:C.muted,fontWeight:600 }}>to</span>
      <select value={to} onChange={e=>onChange(Math.min(from,+e.target.value),+e.target.value)}
        style={{ padding:'5px 10px',border:`1px solid ${C.borderSoft}`,borderRadius:7,fontSize:12,background:C.white,color:C.text }}>
        {MONTHS.map((m,i)=><option key={i} value={i} disabled={i<from}>{m}</option>)}
      </select>
      <span style={{ fontSize:12,color:C.muted }}>{MONTHS[from]}{from!==to?`–${MONTHS[to]}`:''} 2026</span>
    </div>
  )
}

// ── Upload zone ────────────────────────────────────────────────────────────
function UploadZone({emoji,title,sub,loading,onClick,onDrop}:{emoji:string;title:string;sub:string;loading:boolean;onClick:()=>void;onDrop:(f:File)=>void}) {
  return (
    <div style={{ border:`2px dashed ${loading?C.accent:C.borderSoft}`,borderRadius:10,padding:24,textAlign:'center',cursor:'pointer',background:loading?'#F0FAFB':C.bg }}
         onClick={onClick}
         onDragOver={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor=C.accent}}
         onDragLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSoft}}
         onDrop={e=>{e.preventDefault();(e.currentTarget as HTMLElement).style.borderColor=C.borderSoft;const f=e.dataTransfer.files[0];if(f)onDrop(f)}}>
      <div style={{ fontSize:'2rem',marginBottom:8 }}>{loading?'⏳':emoji}</div>
      <div style={{ fontWeight:700,fontSize:13,color:C.navy,marginBottom:4 }}>{loading?'Processing…':title}</div>
      <div style={{ fontSize:11,color:C.muted }}>{sub}</div>
    </div>
  )
}

type Period = 'ytd'|'range'|'0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'
type Metric = 'volume'|'families'|'respaApps'|'initialApps'

const PERIOD_OPTS: {id:Period;label:string}[] = [
  {id:'ytd',label:'YTD'},{id:'range',label:'Custom Range'},
  {id:'0',label:'Jan'},{id:'1',label:'Feb'},{id:'2',label:'Mar'},{id:'3',label:'Apr'},
  {id:'4',label:'May'},{id:'5',label:'Jun'},{id:'6',label:'Jul'},{id:'7',label:'Aug'},
  {id:'8',label:'Sep'},{id:'9',label:'Oct'},{id:'10',label:'Nov'},{id:'11',label:'Dec'},
]

function periodRange(p:Period,from:number,to:number):[number,number] {
  if(p==='ytd')   return [0,11]
  if(p==='range') return [from,to]
  return [+p,+p]
}
function periodLabel(p:Period,from:number,to:number,MONTHS:string[]) {
  if(p==='ytd')   return 'YTD 2026'
  if(p==='range') return `${MONTHS[from]}–${MONTHS[to]} 2026`
  return `${MONTHS[+p]} 2026`
}

// ══════════════════════════════════════════════════════════════════════════
// BRANCH PRODUCTION
// ══════════════════════════════════════════════════════════════════════════
function BranchProduction({maData,onUpload,uploading,uploadMsg}:{maData:MARecord[];onUpload:(f:File)=>void;uploading:boolean;uploadMsg:string}) {
  const [metric,setMetric]=useState<Metric>('volume')
  const [period,setPeriod]=useState<Period>('ytd')
  const [from,setFrom]=useState(0)
  const [to,setTo]=useState(6)
  const [search,setSearch]=useState('')
  const fileRef=useRef<HTMLInputElement>(null)

  const [f,t]=periodRange(period,from,to)
  const mIdxs=Array.from({length:t-f+1},(_,i)=>f+i)

  function val(ma:MARecord):number {
    if(metric==='volume')     return mIdxs.reduce((s,m)=>s+ma.monthlyVolume[m],0)
    if(metric==='families')   return mIdxs.reduce((s,m)=>s+ma.monthlyFamilies[m],0)
    if(metric==='respaApps')  return mIdxs.reduce((s,m)=>s+ma.monthlyRespaApps[m],0)
    return                           mIdxs.reduce((s,m)=>s+ma.monthlyInitialApps[m],0)
  }

  const sorted=maData.filter(m=>val(m)>0&&m.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>val(b)-val(a))
  const maxV=sorted[0]?val(sorted[0]):1
  const medals=['🥇','🥈','🥉']

  const totFam=maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyFamilies[i],0),0)
  const totVol=maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyVolume[i],0),0)
  const totRA =maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyRespaApps[i],0),0)
  const totIA =maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyInitialApps[i],0),0)

  const teamFam=MONTHS.map((_,i)=>maData.reduce((s,m)=>s+m.monthlyFamilies[i],0))
  const teamVol=MONTHS.map((_,i)=>maData.reduce((s,m)=>s+m.monthlyVolume[i],0))
  const pLabel=periodLabel(period,from,to,MONTHS)

  return (
    <div>
      <div style={{ marginBottom:14 }}><ToggleGroup options={PERIOD_OPTS} value={period} onChange={setPeriod} /></div>
      {period==='range' && <RangeSelector from={from} to={to} onChange={(f,t)=>{setFrom(f);setTo(t)}} />}
      <div style={{ marginBottom:20 }}>
        <ToggleGroup options={[{id:'volume',label:'By Volume'},{id:'families',label:'By Families'},{id:'respaApps',label:'By RESPA Apps'},{id:'initialApps',label:'By Initial Apps'}]} value={metric} onChange={setMetric} />
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:22 }}>
        {[{label:'Families Funded',value:totFam,fmt:String,accent:C.accent},{label:'Total Volume',value:totVol,fmt:fmtM,accent:C.accent},{label:'RESPA Apps',value:totRA,fmt:String,accent:'#a78bfa'},{label:'Initial Apps',value:totIA,fmt:String,accent:'#f0b429'}].map(t=>(
          <div key={t.label} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:t.accent }} />
            <div style={{ fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,marginBottom:6 }}>{t.label}</div>
            <div style={{ fontWeight:800,fontSize:28,color:C.navy,lineHeight:1 }}>{t.fmt(t.value)}</div>
            <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>{pLabel}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18 }}>
        <Card><CardHead title="Monthly Families — Team" /><div style={{ padding:'16px 20px' }}><MiniBarChart values={teamFam} labels={MONTHS} color={C.accent} fmt={String} /></div></Card>
        <Card><CardHead title="Monthly Volume — Team" /><div style={{ padding:'16px 20px' }}><MiniBarChart values={teamVol} labels={MONTHS} color={C.accent} fmt={fmtM} /></div></Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHead title="Leaderboard" right={
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search LO…" style={{ padding:'6px 11px',border:`1px solid ${C.borderSoft}`,borderRadius:7,fontSize:12,background:C.bg,color:C.text,width:140 }} />
            <span style={{ fontSize:12,color:C.muted }}>{sorted.length} LOs · {pLabel}</span>
          </div>
        }>
        </CardHead>
        {sorted.length===0 && <div style={{ padding:32,textAlign:'center',color:C.muted }}>No data for this period.</div>}
        {sorted.map((ma,i)=>{
          const v=val(ma),pct=(v/maxV*100).toFixed(1),disp=metric==='volume'?fmtM(v):String(v)
          return (
            <div key={ma.name} style={{ display:'flex',alignItems:'center',gap:14,padding:'11px 20px',borderBottom:`1px solid ${C.border}`,background:i===0?'#F0FAFB':undefined }}>
              <div style={{ width:28,textAlign:'center',flexShrink:0 }}>{i<3?medals[i]:<span style={{ fontWeight:700,color:C.muted,fontSize:13 }}>{i+1}</span>}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                  <span style={{ fontWeight:700,fontSize:13,color:C.navy }}>{ma.name}</span>
                  <span style={{ fontSize:11,color:C.muted }}>{ma.ytdFamilies} funded YTD · {fmtM(ma.ytdVolume)}</span>
                </div>
                <div style={{ height:5,background:C.bg,borderRadius:3,overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`,height:'100%',background:i===0?C.accent:C.navy,opacity:i===0?1:i===1?0.5:0.3,borderRadius:3 }} />
                </div>
              </div>
              <div style={{ fontFamily:'Consolas,monospace',fontSize:14,fontWeight:700,color:i===0?C.navy:C.text,whiteSpace:'nowrap',minWidth:80,textAlign:'right' }}>{disp}</div>
            </div>
          )
        })}
      </Card>

      {/* Detail table */}
      <Card>
        <CardHead title="LO Detail — All Metrics (YTD)" right={<span style={{ fontSize:12,color:C.muted }}>Sorted by families funded</span>} />
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',minWidth:700 }}>
            <thead><tr style={{ background:C.bg }}>{['Rank','Loan Officer','Families','Volume','RESPA Apps','Initial Apps','Conv %'].map((h,i)=>(
              <th key={h} style={{ fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,padding:'9px 14px',textAlign:i===1?'left':'right',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap' }}>{h}</th>
            ))}</tr></thead>
            <tbody>{[...maData].sort((a,b)=>b.ytdFamilies-a.ytdFamilies).filter(m=>m.ytdFamilies>0||m.ytdRespaApps>0).map((ma,i)=>{
              const conv=ma.ytdRespaApps>0?(ma.ytdFamilies/ma.ytdRespaApps*100).toFixed(0)+'%':'—'
              const cvn=parseFloat(conv)
              return (
                <tr key={ma.name} style={{ borderBottom:`1px solid ${C.border}`,background:i%2===1?'#FAFBFC':C.white }}>
                  <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:12,color:C.muted }}>{i+1}</td>
                  <td style={{ padding:'10px 14px',fontWeight:600,color:C.navy,fontSize:13 }}>{ma.name}</td>
                  <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13 }}>{ma.ytdFamilies}</td>
                  <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,fontWeight:700,color:C.navy }}>{fmtM(ma.ytdVolume)}</td>
                  <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13 }}>{ma.ytdRespaApps}</td>
                  <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13 }}>{ma.ytdInitialApps}</td>
                  <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,color:cvn>=50?C.green:cvn>=30?C.amber:C.red }}>{conv}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </Card>

      {/* Fundings upload */}
      <Card>
        <CardHead title="Update Fundings Data" right={<span style={{ fontSize:12,color:C.muted }}>Upload new YTD Fundings CSV/Excel · deduplicates by Loan ID</span>} />
        <div style={{ padding:'20px 24px' }}>
          {uploadMsg && <div style={{ marginBottom:14,padding:'10px 14px',background:uploadMsg.startsWith('✅')?C.greenBg:'rgba(220,38,38,0.07)',border:`1px solid ${uploadMsg.startsWith('✅')?'#bbf7d0':'#fecaca'}`,borderRadius:8,fontSize:13,color:C.navy }}>{uploadMsg}</div>}
          <UploadZone emoji="📂" title="Drop YTD Fundings CSV / Excel here" sub="Same format as FinFree YTD Fundings export — replaces all funding data, deduplicates by Loan ID" loading={uploading}
            onClick={()=>fileRef.current?.click()} onDrop={f=>onUpload(f)} />
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)onUpload(f)}} />
        </div>
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// APPLICATIONS TAB
// ══════════════════════════════════════════════════════════════════════════
function ApplicationsTab({maData,weeks,onWeekUpload,onAppsUpload,weekUploading,weekMsg,appsUploading,appsMsg}:{
  maData:MARecord[]; weeks:WeeklyRow[]
  onWeekUpload:(f:File)=>void; onAppsUpload:(f:File,type:'respa'|'initial')=>void
  weekUploading:boolean; weekMsg:string; appsUploading:boolean; appsMsg:string
}) {
  const [view,setView]=useState<'weekly'|'monthly'>('weekly')
  const [appPeriod,setAppPeriod]=useState<Period>('ytd')
  const [from,setFrom]=useState(0)
  const [to,setTo]=useState(6)
  const weekRef=useRef<HTMLInputElement>(null)
  const respaRef=useRef<HTMLInputElement>(null)
  const initRef=useRef<HTMLInputElement>(null)

  const sorted=[...weeks].sort((a,b)=>a.weekStart.localeCompare(b.weekStart))
  const cur=sorted[sorted.length-1], prev=sorted[sorted.length-2]

  const teamRespa   =MONTHS.map((_,i)=>maData.reduce((s,m)=>s+m.monthlyRespaApps[i],0))
  const teamInitial =MONTHS.map((_,i)=>maData.reduce((s,m)=>s+m.monthlyInitialApps[i],0))
  const teamFam     =MONTHS.map((_,i)=>maData.reduce((s,m)=>s+m.monthlyFamilies[i],0))

  const [mf,mt]=periodRange(appPeriod,from,to)
  const mIdxs=Array.from({length:mt-mf+1},(_,i)=>mf+i)
  const totRA =maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyRespaApps[i],0),0)
  const totIA =maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyInitialApps[i],0),0)
  const totFam=maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyFamilies[i],0),0)
  const totVol=maData.reduce((s,m)=>s+mIdxs.reduce((a,i)=>a+m.monthlyVolume[i],0),0)

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <ToggleGroup options={[{id:'weekly',label:'Weekly Tracking'},{id:'monthly',label:'Monthly (CSV Data)'}]} value={view} onChange={setView} />
      </div>

      {view==='weekly' ? (
        <>
          {/* KPIs */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:22 }}>
            {[{label:'RESPA Families',value:cur?.totalFamilies??0,prev:prev?.totalFamilies,accent:C.accent,fmt:String},{label:'Funded Volume',value:cur?.totalVolume??0,prev:prev?.totalVolume,accent:C.accent,fmt:fmtM},{label:'Initial Apps',value:cur?.totalApps??0,prev:prev?.totalApps,accent:'#a78bfa',fmt:String},{label:'Self Gen Apps',value:cur?.sgApps??0,prev:prev?.sgApps,accent:'#f0b429',fmt:String}].map(tile=>(
              <div key={tile.label} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:tile.accent }} />
                <div style={{ fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,marginBottom:6 }}>{tile.label}</div>
                <div style={{ display:'flex',alignItems:'baseline',gap:4,flexWrap:'wrap' }}>
                  <div style={{ fontWeight:800,fontSize:28,color:C.navy,lineHeight:1 }}>{tile.fmt(tile.value)}</div>
                  {tile.prev!=null&&<DeltaBadge cur={tile.value} prev={tile.prev} />}
                </div>
                <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>{cur?.weekLabel??'—'}</div>
              </div>
            ))}
          </div>

          {/* WoW */}
          {cur&&prev&&(
            <Card>
              <CardHead title="Week-over-Week" right={<span style={{ fontSize:12,color:C.muted }}>{prev.weekLabel} → {cur.weekLabel}</span>} />
              <div style={{ padding:'14px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                {([['Total Families',prev.totalFamilies,cur.totalFamilies,(n:number)=>n+' fam'],['Volume',prev.totalVolume,cur.totalVolume,fmtM],['SG Families',prev.sgFamilies,cur.sgFamilies,(n:number)=>n+' fam'],['BL Families',prev.blFamilies,cur.blFamilies,(n:number)=>n+' fam'],['Initial Apps',prev.totalApps,cur.totalApps,(n:number)=>n+' apps'],['SG Apps',prev.sgApps,cur.sgApps,(n:number)=>n+' apps'],['BL Apps',prev.blApps,cur.blApps,(n:number)=>n+' apps']] as [string,number,number,(n:number)=>string][]).map(([label,pv,cv,fmt])=>{
                  const p=pctCh(cv,pv),up=p!==null&&p>0.5,dn=p!==null&&p<-0.5
                  return (
                    <div key={label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${C.border}` }}>
                      <span style={{ fontSize:12,color:C.muted }}>{label}</span>
                      <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                        <span style={{ fontSize:12,color:C.muted,fontFamily:'Consolas,monospace' }}>{fmt(pv)}</span>
                        <span style={{ color:C.border }}>→</span>
                        <span style={{ fontFamily:'Consolas,monospace',fontSize:13,fontWeight:700,color:up?C.green:dn?C.red:C.navy }}>{fmt(cv)}</span>
                        {p!==null&&<DeltaBadge cur={cv} prev={pv} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Charts */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18 }}>
            <Card><CardHead title="Weekly RESPA Families" /><div style={{ padding:'16px 20px' }}><MiniBarChart values={sorted.map(w=>w.totalFamilies)} labels={sorted.map(w=>w.weekLabel.split('–')[0])} color={C.accent} fmt={String} /></div></Card>
            <Card><CardHead title="Weekly Initial Apps" /><div style={{ padding:'16px 20px' }}><MiniBarChart values={sorted.map(w=>w.totalApps)} labels={sorted.map(w=>w.weekLabel.split('–')[0])} color="#a78bfa" fmt={String} /></div></Card>
          </div>

          {/* History */}
          <Card>
            <CardHead title="Weekly History" right={<span style={{ fontSize:12,color:C.muted }}>{sorted.length} weeks · newest first</span>} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',minWidth:700 }}>
                <thead><tr style={{ background:C.bg }}>{['Week','Families','Volume','SG Fam','BL Fam','Apps','SG Apps','BL Apps','WoW Fam','WoW Apps'].map((h,i)=>(
                  <th key={h} style={{ fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,padding:'9px 14px',textAlign:i===0?'left':'right',borderBottom:`1px solid ${C.border}`,whiteSpace:'nowrap' }}>{h}</th>
                ))}</tr></thead>
                <tbody>{[...sorted].reverse().map((w,ri)=>{
                  const oi=sorted.length-1-ri,pw=oi>0?sorted[oi-1]:null,isCur=ri===0
                  return (
                    <tr key={w.id} style={{ borderBottom:`1px solid ${C.border}`,background:isCur?'#F0FAFB':ri%2===1?'#FAFBFC':C.white }}>
                      <td style={{ padding:'10px 14px',fontWeight:isCur?700:500,color:C.navy,fontSize:13,whiteSpace:'nowrap' }}>{isCur?'★ ':''}{w.weekLabel}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,fontWeight:isCur?700:400 }}>{w.totalFamilies}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,color:C.dim }}>{fmtM(w.totalVolume)}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,color:C.dim }}>{w.sgFamilies}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,color:C.dim }}>{w.blFamilies}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,fontWeight:isCur?700:400 }}>{w.totalApps}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,color:C.dim }}>{w.sgApps}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,color:C.dim }}>{w.blApps}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontSize:11 }}>{pw?<DeltaBadge cur={w.totalFamilies} prev={pw.totalFamilies} />:<span style={{ color:C.muted }}>—</span>}</td>
                      <td style={{ padding:'10px 14px',textAlign:'right',fontSize:11 }}>{pw?<DeltaBadge cur={w.totalApps} prev={pw.totalApps} />:<span style={{ color:C.muted }}>—</span>}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </Card>

          {/* Weekly upload */}
          <Card>
            <CardHead title="Upload Weekly Summary" right={<span style={{ fontSize:12,color:C.muted }}>Adds new weeks · skips duplicates by week label</span>} />
            <div style={{ padding:'20px 24px' }}>
              {weekMsg&&<div style={{ marginBottom:14,padding:'10px 14px',background:weekMsg.startsWith('✅')?C.greenBg:'rgba(220,38,38,0.07)',border:`1px solid ${weekMsg.startsWith('✅')?'#bbf7d0':'#fecaca'}`,borderRadius:8,fontSize:13,color:C.navy }}>{weekMsg}</div>}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:24 }}>
                <UploadZone emoji="📅" title="Drop weekly summary Excel here" sub="Column A = week label (dedup key) · B=Families · C=Volume · D=SGFam · E=BLFam · F=Apps · G=SGApps · H=BLApps" loading={weekUploading} onClick={()=>weekRef.current?.click()} onDrop={f=>onWeekUpload(f)} />
                <div>
                  <div style={{ fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,marginBottom:10 }}>Example row</div>
                  <table style={{ width:'100%',borderCollapse:'collapse',fontSize:11 }}>
                    <thead><tr style={{ background:C.bg }}>{['Week','Fam','Vol','SGFam','BLFam','Apps','SG','BL'].map(h=><th key={h} style={{ padding:'5px 8px',textAlign:'left',borderBottom:`1px solid ${C.border}`,color:C.muted,fontWeight:600,fontSize:10 }}>{h}</th>)}</tr></thead>
                    <tbody><tr>{['Jul 11–17','22','11000000','17','5','75','50','25'].map((v,i)=><td key={i} style={{ padding:'5px 8px',fontFamily:'Consolas,monospace',color:C.dim,fontSize:11 }}>{v}</td>)}</tr></tbody>
                  </table>
                </div>
              </div>
              <input ref={weekRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)onWeekUpload(f)}} />
            </div>
          </Card>
        </>
      ) : (
        /* Monthly view */
        <>
          <div style={{ marginBottom:14 }}><ToggleGroup options={PERIOD_OPTS} value={appPeriod} onChange={setAppPeriod} /></div>
          {appPeriod==='range'&&<RangeSelector from={from} to={to} onChange={(f,t)=>{setFrom(f);setTo(t)}} />}

          {/* KPIs */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:14,marginBottom:22 }}>
            {[{label:'RESPA Apps',value:totRA,accent:'#a78bfa'},{label:'Initial Apps',value:totIA,accent:'#f0b429'},{label:'Families Funded',value:totFam,accent:C.accent},{label:'Volume',value:totVol,accent:C.accent,money:true}].map(t=>(
              <div key={t.label} style={{ background:C.white,border:`1px solid ${C.border}`,borderRadius:12,padding:'16px 18px',position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:t.accent }} />
                <div style={{ fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,marginBottom:6 }}>{t.label}</div>
                <div style={{ fontWeight:800,fontSize:28,color:C.navy,lineHeight:1 }}>{'money' in t&&t.money?fmtM(t.value):t.value}</div>
                <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>{periodLabel(appPeriod,from,to,MONTHS)}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18 }}>
            <Card><CardHead title="Monthly RESPA Apps — Team" /><div style={{ padding:'16px 20px' }}><MiniBarChart values={teamRespa} labels={MONTHS} color="#a78bfa" fmt={String} /></div></Card>
            <Card><CardHead title="Monthly Initial Apps — Team" /><div style={{ padding:'16px 20px' }}><MiniBarChart values={teamInitial} labels={MONTHS} color="#f0b429" fmt={String} /></div></Card>
          </div>

          {/* RESPA table */}
          <Card>
            <CardHead title="RESPA Apps by LO — Monthly" right={<span style={{ fontSize:12,color:C.muted }}>Peak month highlighted green</span>} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',minWidth:900 }}>
                <thead><tr style={{ background:C.bg }}>
                  <th style={{ fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,padding:'9px 14px',textAlign:'left',borderBottom:`1px solid ${C.border}` }}>LO</th>
                  {MONTHS.map(m=><th key={m} style={{ fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,padding:'9px 10px',textAlign:'right',borderBottom:`1px solid ${C.border}` }}>{m}</th>)}
                  <th style={{ fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',color:C.muted,padding:'9px 14px',textAlign:'right',borderBottom:`1px solid ${C.border}` }}>YTD</th>
                </tr></thead>
                <tbody>
                  {[...maData].filter(m=>m.ytdRespaApps>0).sort((a,b)=>b.ytdRespaApps-a.ytdRespaApps).map((ma,i)=>(
                    <tr key={ma.name} style={{ borderBottom:`1px solid ${C.border}`,background:i%2===1?'#FAFBFC':C.white }}>
                      <td style={{ padding:'9px 14px',fontWeight:600,color:C.navy,fontSize:13 }}>{ma.name}</td>
                      {ma.monthlyRespaApps.map((v,mi)=>{ const pk=v>0&&v===Math.max(...ma.monthlyRespaApps); return <td key={mi} style={{ padding:'9px 10px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:12,color:pk?C.green:C.text,fontWeight:pk?700:400,background:pk?C.greenBg:undefined }}>{v||'—'}</td> })}
                      <td style={{ padding:'9px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,fontWeight:700,color:C.navy }}>{ma.ytdRespaApps}</td>
                    </tr>
                  ))}
                  <tr style={{ background:C.bg,borderTop:`2px solid ${C.border}` }}>
                    <td style={{ padding:'9px 14px',fontWeight:700,color:C.navy,fontSize:12 }}>TEAM TOTAL</td>
                    {teamRespa.map((v,i)=><td key={i} style={{ padding:'9px 10px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:12,fontWeight:700,color:C.navy }}>{v}</td>)}
                    <td style={{ padding:'9px 14px',textAlign:'right',fontFamily:'Consolas,monospace',fontSize:13,fontWeight:700,color:C.navy }}>{maData.reduce((s,m)=>s+m.ytdRespaApps,0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* CSV uploads for apps */}
          <Card>
            <CardHead title="Update Apps Data from CSV" right={<span style={{ fontSize:12,color:C.muted }}>Upload new YTD exports · deduplicates by Loan ID</span>} />
            <div style={{ padding:'20px 24px' }}>
              {appsMsg&&<div style={{ marginBottom:14,padding:'10px 14px',background:appsMsg.startsWith('✅')?C.greenBg:'rgba(220,38,38,0.07)',border:`1px solid ${appsMsg.startsWith('✅')?'#bbf7d0':'#fecaca'}`,borderRadius:8,fontSize:13,color:C.navy }}>{appsMsg}</div>}
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:18 }}>
                <UploadZone emoji="📋" title="RESPA Apps YTD" sub="FinFree YTD Respa Apps format · deduplicates by Loan ID" loading={appsUploading} onClick={()=>respaRef.current?.click()} onDrop={f=>onAppsUpload(f,'respa')} />
                <UploadZone emoji="📋" title="Initial Apps YTD" sub="FinFree YTD Initial Aps format · deduplicates by Loan ID" loading={appsUploading} onClick={()=>initRef.current?.click()} onDrop={f=>onAppsUpload(f,'initial')} />
              </div>
              <input ref={respaRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)onAppsUpload(f,'respa')}} />
              <input ref={initRef}  type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)onAppsUpload(f,'initial')}} />
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
const SUB_TABS=[{id:'branch',label:'Branch Production'},{id:'apps',label:'Applications'}] as const
type SubTab=typeof SUB_TABS[number]['id']

export default function Production() {
  const [activeTab,setActiveTab]=useState<SubTab>('branch')
  const [maData,setMAData]=useState<MARecord[]>(SEED_MA)
  const [weeks,setWeeks]=useState<WeeklyRow[]>(SEED_WEEKLY)

  const [fundUploading,setFundUploading]=useState(false); const [fundMsg,setFundMsg]=useState('')
  const [weekUploading,setWeekUploading]=useState(false); const [weekMsg,setWeekMsg]=useState('')
  const [appsUploading,setAppsUploading]=useState(false); const [appsMsg,setAppsMsg]=useState('')

  const readRows=useCallback(async(file:File):Promise<Record<string,unknown>[]>=>{
    const buf=await file.arrayBuffer()
    if(file.name.endsWith('.csv')){
      const text=new TextDecoder().decode(buf)
      const lines=text.split(/\r?\n/)
      if(lines.length<2) return []
      const headers=lines[0].split(',').map(h=>h.replace(/^"|"$/g,'').trim())
      return lines.slice(1).filter(l=>l.trim()).map(l=>{
        const vals=l.split(',').map(v=>v.replace(/^"|"$/g,'').trim())
        const row:Record<string,unknown>={}
        headers.forEach((h,i)=>{row[h]=vals[i]??''})
        return row
      })
    }
    const wb=XLSX.read(buf,{type:'array'})
    return XLSX.utils.sheet_to_json<Record<string,unknown>>(wb.Sheets[wb.SheetNames[0]],{defval:''})
  },[])

  async function handleFundingsUpload(file:File){
    setFundUploading(true); setFundMsg('')
    try {
      const rows=await readRows(file)
      const parsed=parseFundingsRows(rows)
      if(parsed.length===0){setFundMsg('❌ No 2026 funded loans found — check that "Assigned LC" and "Actual funding Date" columns are present');setFundUploading(false);return}
      // Merge: keep existing RESPA/Initial app data
      const respaMap =new Map(maData.map(m=>[m.name,m.monthlyRespaApps]))
      const initMap  =new Map(maData.map(m=>[m.name,m.monthlyInitialApps]))
      const merged=parsed.map(m=>({
        ...m,
        monthlyRespaApps:  respaMap.get(m.name)??new Array(12).fill(0),
        monthlyInitialApps: initMap.get(m.name)??new Array(12).fill(0),
        ytdRespaApps:  (respaMap.get(m.name)??[]).reduce((a:number,b:number)=>a+b,0),
        ytdInitialApps: (initMap.get(m.name)??[]).reduce((a:number,b:number)=>a+b,0),
      }))
      // Preserve LOs that have apps but no fundings in the new file
      maData.filter(m=>!parsed.find(p=>p.name===m.name)&&(m.ytdRespaApps>0||m.ytdInitialApps>0)).forEach(m=>{
        merged.push({...m,ytdFamilies:0,ytdVolume:0,monthlyFamilies:new Array(12).fill(0),monthlyVolume:new Array(12).fill(0)})
      })
      setMAData(merged)
      const tf=parsed.reduce((s,m)=>s+m.ytdFamilies,0),tv=parsed.reduce((s,m)=>s+m.ytdVolume,0)
      setFundMsg(`✅ Loaded ${rows.length} records → ${tf} families funded · ${fmtM(tv)} · ${parsed.length} LOs`)
    } catch(e){setFundMsg('❌ Error reading file: '+String(e))}
    setFundUploading(false)
  }

  async function handleWeekUpload(file:File){
    setWeekUploading(true); setWeekMsg('')
    try {
      const rows=await readRows(file)
      const existing=new Set(weeks.map(w=>w.weekLabel))
      const newW:WeeklyRow[]=[]; let dups=0
      rows.forEach((row,i)=>{
        const vals=Object.values(row); const label=String(vals[0]??'').trim(); if(!label) return
        if(existing.has(label)){dups++;return}
        newW.push({id:`u-${Date.now()}-${i}`,weekLabel:label,weekStart:'',totalFamilies:+String(vals[1]).replace(/[^0-9.]/g,'')||0,totalVolume:parseFloat(String(vals[2]).replace(/[^0-9.]/g,''))||0,sgFamilies:+String(vals[3]).replace(/[^0-9]/g,'')||0,blFamilies:+String(vals[4]).replace(/[^0-9]/g,'')||0,totalApps:+String(vals[5]).replace(/[^0-9]/g,'')||0,sgApps:+String(vals[6]).replace(/[^0-9]/g,'')||0,blApps:+String(vals[7]).replace(/[^0-9]/g,'')||0})
      })
      setWeeks(prev=>[...prev,...newW])
      setWeekMsg(`✅ Added ${newW.length} week(s)${dups?` · ${dups} duplicate(s) skipped`:''}`)
    } catch{setWeekMsg('❌ Error reading file')}
    setWeekUploading(false)
  }

  async function handleAppsUpload(file:File,type:'respa'|'initial'){
    setAppsUploading(true); setAppsMsg('')
    try {
      const rows=await readRows(file)
      const appMap=parseAppsRows(rows)
      const total=[...appMap.values()].reduce((s,arr)=>s+arr.reduce((a,b)=>a+b,0),0)
      if(total===0){setAppsMsg('❌ No 2026 records found — check that "Assigned LC" and "Application created at" columns are present');setAppsUploading(false);return}
      setMAData(prev=>{
        const map=new Map(prev.map(m=>[m.name,{...m,monthlyRespaApps:[...m.monthlyRespaApps],monthlyInitialApps:[...m.monthlyInitialApps]}]))
        appMap.forEach((counts,lo)=>{
          if(!map.has(lo)) map.set(lo,emptyMA(lo))
          const ma=map.get(lo)!
          if(type==='respa'){counts.forEach((v,i)=>{ma.monthlyRespaApps[i]=v}); ma.ytdRespaApps=counts.reduce((a,b)=>a+b,0)}
          else              {counts.forEach((v,i)=>{ma.monthlyInitialApps[i]=v}); ma.ytdInitialApps=counts.reduce((a,b)=>a+b,0)}
        })
        return [...map.values()]
      })
      setAppsMsg(`✅ Updated ${type==='respa'?'RESPA':'Initial'} Apps — ${rows.length} records · ${total} apps · ${appMap.size} LOs`)
    } catch(e){setAppsMsg('❌ Error reading file: '+String(e))}
    setAppsUploading(false)
  }

  const ytdFam=maData.reduce((s,m)=>s+m.ytdFamilies,0)
  const ytdVol=maData.reduce((s,m)=>s+m.ytdVolume,0)
  const ytdRA =maData.reduce((s,m)=>s+m.ytdRespaApps,0)

  return (
    <div style={{ maxWidth:1100,margin:'0 auto',padding:'36px 40px 90px' }}>
      <div style={{ marginBottom:26 }}>
        <h1 style={{ fontWeight:800,letterSpacing:'-.02em',fontSize:32,margin:0,color:C.navy }}>Production</h1>
        <div style={{ fontSize:14,color:C.muted,marginTop:5 }}>FinFree Division · 2026 — {ytdFam} families funded · {fmtM(ytdVol)} · {ytdRA} RESPA apps</div>
      </div>
      <div style={{ display:'flex',borderBottom:`2px solid ${C.border}`,marginBottom:28 }}>
        {SUB_TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ padding:'10px 22px',fontSize:13,fontWeight:700,cursor:'pointer',border:'none',background:'none',color:activeTab===tab.id?C.navy:C.muted,borderBottom:`2px solid ${activeTab===tab.id?C.accent:'transparent'}`,marginBottom:-2,transition:'color .12s' }}>{tab.label}</button>
        ))}
      </div>
      {activeTab==='branch'&&<BranchProduction maData={maData} onUpload={handleFundingsUpload} uploading={fundUploading} uploadMsg={fundMsg} />}
      {activeTab==='apps'  &&<ApplicationsTab maData={maData} weeks={weeks} onWeekUpload={handleWeekUpload} onAppsUpload={handleAppsUpload} weekUploading={weekUploading} weekMsg={weekMsg} appsUploading={appsUploading} appsMsg={appsMsg} />}
    </div>
  )
}
