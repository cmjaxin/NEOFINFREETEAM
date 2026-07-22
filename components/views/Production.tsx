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
  ytdFamiliesSG: number; ytdVolumeSG: number
  ytdFamiliesD2C: number; ytdVolumeD2C: number
  ytdRespaAppsSG: number; ytdRespaAppsD2C: number
  ytdInitialAppsSG: number; ytdInitialAppsD2C: number
  monthlyFamilies: number[]
  monthlyVolume: number[]
  monthlyFamiliesSG: number[]
  monthlyVolumeSG: number[]
  monthlyFamiliesD2C: number[]
  monthlyVolumeD2C: number[]
  monthlyRespaApps: number[]
  monthlyInitialApps: number[]
  monthlyRespaAppsSG: number[]
  monthlyRespaAppsD2C: number[]
  monthlyInitialAppsSG: number[]
  monthlyInitialAppsD2C: number[]
}

interface BranchFundEntry { branch: string; families: number; volume: number }
interface BranchCountEntry { branch: string; count: number }
interface MaWeekEntry { name: string; respa: number; initial: number }

interface WeeklyRow {
  weekLabel: string     // e.g. "Jul 4 – Jul 10"
  weekStart?: string    // ISO "2026-07-04" for sorting
  families: number
  volume: number
  respaApps: number
  initialApps: number
  sgRespaByBranch?: BranchFundEntry[]
  d2cRespaByBranch?: BranchFundEntry[]
  sgInitialByBranch?: BranchCountEntry[]
  d2cInitialByBranch?: BranchCountEntry[]
  sgByMA?: MaWeekEntry[]
  d2cByMA?: MaWeekEntry[]
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
  { name:'Katrinka Condie', ytdFamilies:58, ytdVolume:41832995, ytdRespaApps:63, ytdInitialApps:90, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[5,5,16,7,9,13,3,0,0,0,0,0], monthlyVolume:[2699708,2526094,12053658,5666263,6676691,8167395,4043186,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[7,15,8,6,7,15,5,0,0,0,0,0], monthlyInitialApps:[35,32,16,2,1,4,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Justin Padron', ytdFamilies:52, ytdVolume:34456944, ytdRespaApps:51, ytdInitialApps:61, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[11,5,5,9,10,8,4,0,0,0,0,0], monthlyVolume:[4686842,2872015,4168096,6800626,5526631,5071814,5330920,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[6,4,11,10,10,6,4,0,0,0,0,0], monthlyInitialApps:[15,14,22,3,6,1,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Skyler Ford', ytdFamilies:42, ytdVolume:20579512, ytdRespaApps:44, ytdInitialApps:108, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[5,5,6,8,6,9,3,0,0,0,0,0], monthlyVolume:[2640796,3095608,2637081,4393457,2184064,4316391,1312115,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[6,5,7,9,8,4,5,0,0,0,0,0], monthlyInitialApps:[36,26,40,3,1,2,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Gregory Allen', ytdFamilies:38, ytdVolume:6629447, ytdRespaApps:61, ytdInitialApps:159, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[6,5,9,6,4,7,1,0,0,0,0,0], monthlyVolume:[1070876,879683,2060016,723084,760147,1025670,109971,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[5,8,8,8,18,11,3,0,0,0,0,0], monthlyInitialApps:[41,66,45,4,2,1,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Jason Drobeck', ytdFamilies:36, ytdVolume:24556291, ytdRespaApps:51, ytdInitialApps:82, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[3,9,7,4,4,4,5,0,0,0,0,0], monthlyVolume:[1190250,5819496,5016537,2183977,5287250,1874296,3184485,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[12,6,7,9,6,7,4,0,0,0,0,0], monthlyInitialApps:[30,27,20,3,1,1,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Drake Bloebaum', ytdFamilies:36, ytdVolume:17801759, ytdRespaApps:56, ytdInitialApps:101, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[5,3,6,6,4,10,2,0,0,0,0,0], monthlyVolume:[1238182,1129020,4279148,3036050,1511050,5734309,874000,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[8,8,8,5,10,12,5,0,0,0,0,0], monthlyInitialApps:[26,38,32,1,1,2,1,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Matthew Smith', ytdFamilies:23, ytdVolume:11769740, ytdRespaApps:37, ytdInitialApps:135, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[1,5,6,6,3,2,0,0,0,0,0,0], monthlyVolume:[832750,1336345,3304868,3045064,2299950,950763,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[5,7,8,8,2,6,1,0,0,0,0,0], monthlyInitialApps:[28,41,62,3,0,0,1,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Ross Zimmerman', ytdFamilies:33, ytdVolume:16957257, ytdRespaApps:57, ytdInitialApps:113, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[4,2,6,7,4,9,1,0,0,0,0,0], monthlyVolume:[3224378,768000,2927940,3678830,2810661,3354753,192695,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[10,7,6,9,13,6,6,0,0,0,0,0], monthlyInitialApps:[48,32,26,1,2,1,3,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Aaron Thomas', ytdFamilies:29, ytdVolume:13804933, ytdRespaApps:44, ytdInitialApps:74, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[2,5,4,6,4,4,4,0,0,0,0,0], monthlyVolume:[477350,1763950,2165373,4362040,1632155,1722600,1681465,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[6,9,11,7,8,3,0,0,0,0,0,0], monthlyInitialApps:[18,25,29,1,0,1,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Kaytlin Collins', ytdFamilies:22, ytdVolume:5432496, ytdRespaApps:45, ytdInitialApps:64, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[1,4,3,5,3,3,3,0,0,0,0,0], monthlyVolume:[308750,425333,1184679,1372807,774790,838000,528137,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[3,5,9,6,3,16,3,0,0,0,0,0], monthlyInitialApps:[12,16,31,1,0,4,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Scott DiGregorio', ytdFamilies:22, ytdVolume:10541726, ytdRespaApps:22, ytdInitialApps:34, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[3,5,0,5,4,5,0,0,0,0,0,0], monthlyVolume:[1000000,1260443,0,2494609,1601500,4185174,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[5,2,3,4,4,2,2,0,0,0,0,0], monthlyInitialApps:[11,10,12,1,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Edgardo Balentine', ytdFamilies:21, ytdVolume:7856649, ytdRespaApps:36, ytdInitialApps:52, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[2,2,5,3,4,4,1,0,0,0,0,0], monthlyVolume:[795000,348616,1781326,858925,1971751,1881290,219741,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[4,5,4,4,6,5,8,0,0,0,0,0], monthlyInitialApps:[13,20,18,1,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Michael Breen', ytdFamilies:17, ytdVolume:8562801, ytdRespaApps:20, ytdInitialApps:30, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[1,4,3,0,4,3,2,0,0,0,0,0], monthlyVolume:[158000,1595012,2395342,0,1592704,1121743,1700000,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[5,2,2,6,4,1,0,0,0,0,0,0], monthlyInitialApps:[9,12,8,1,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Michael Jones', ytdFamilies:15, ytdVolume:6748235, ytdRespaApps:29, ytdInitialApps:134, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[4,4,0,1,2,4,0,0,0,0,0,0], monthlyVolume:[1946862,1465882,0,524400,1482000,1329091,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[6,4,6,4,5,1,3,0,0,0,0,0], monthlyInitialApps:[39,32,61,1,1,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Benjamin Kyle', ytdFamilies:13, ytdVolume:6415893, ytdRespaApps:15, ytdInitialApps:83, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[4,0,2,0,4,3,0,0,0,0,0,0], monthlyVolume:[1765550,0,928650,0,2772050,949643,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[1,1,1,3,7,2,0,0,0,0,0,0], monthlyInitialApps:[16,43,22,2,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'David Nelson', ytdFamilies:11, ytdVolume:3728819, ytdRespaApps:17, ytdInitialApps:116, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[0,1,2,3,4,0,1,0,0,0,0,0], monthlyVolume:[0,400500,398940,1915750,477379,0,536250,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[1,2,5,2,3,2,2,0,0,0,0,0], monthlyInitialApps:[32,29,54,1,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Anthony Alfonso Soto', ytdFamilies:5, ytdVolume:1475303, ytdRespaApps:7, ytdInitialApps:9, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[0,0,1,2,1,0,1,0,0,0,0,0], monthlyVolume:[0,0,424000,519816,282987,0,248500,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[1,0,2,1,1,2,0,0,0,0,0,0], monthlyInitialApps:[3,2,4,0,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Ashley Roberts', ytdFamilies:5, ytdVolume:1907773, ytdRespaApps:9, ytdInitialApps:6, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[0,0,0,1,1,1,2,0,0,0,0,0], monthlyVolume:[0,0,0,423200,236000,375000,873573,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[0,0,1,2,3,3,0,0,0,0,0,0], monthlyInitialApps:[0,3,3,0,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Ryan Todey', ytdFamilies:3, ytdVolume:1597186, ytdRespaApps:1, ytdInitialApps:3, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[2,1,0,0,0,0,0,0,0,0,0,0], monthlyVolume:[1340611,256575,0,0,0,0,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[1,0,0,0,0,0,0,0,0,0,0,0], monthlyInitialApps:[3,0,0,0,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Bryon Wensel', ytdFamilies:2, ytdVolume:487986, ytdRespaApps:3, ytdInitialApps:7, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[1,0,0,0,1,0,0,0,0,0,0,0], monthlyVolume:[187986,0,0,0,300000,0,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[1,0,0,1,0,0,1,0,0,0,0,0], monthlyInitialApps:[0,1,6,0,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Joshua Mettle', ytdFamilies:2, ytdVolume:900500, ytdRespaApps:3, ytdInitialApps:3, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[0,0,1,0,0,0,1,0,0,0,0,0], monthlyVolume:[0,0,400500,0,0,0,500000,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[0,1,0,0,0,2,0,0,0,0,0,0], monthlyInitialApps:[0,3,0,0,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
  { name:'Matthew McNally', ytdFamilies:1, ytdVolume:289060, ytdRespaApps:0, ytdInitialApps:4, ytdFamiliesSG:0, ytdVolumeSG:0, ytdFamiliesD2C:0, ytdVolumeD2C:0, ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0, monthlyFamilies:[1,0,0,0,0,0,0,0,0,0,0,0], monthlyVolume:[289060,0,0,0,0,0,0,0,0,0,0,0], monthlyFamiliesSG:Array(12).fill(0) as number[], monthlyVolumeSG:Array(12).fill(0) as number[], monthlyFamiliesD2C:Array(12).fill(0) as number[], monthlyVolumeD2C:Array(12).fill(0) as number[], monthlyRespaApps:[0,0,0,0,0,0,0,0,0,0,0,0], monthlyInitialApps:[1,1,2,0,0,0,0,0,0,0,0,0], monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[], monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[], },
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

function branchForMA(maName: string): string {
  for (const bc of BRANCH_CONFIG) {
    if (bc.members.some(m => nameSimilar(m, maName))) return bc.name
  }
  return 'Other'
}

function isoWeekLabel(dt: Date): string {
  const mon = new Date(dt)
  const day = mon.getDay()
  const diff = day === 0 ? -6 : 1 - day
  mon.setDate(mon.getDate() + diff)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmtD = (d: Date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[d.getMonth()]} ${d.getDate()}`
  }
  return `${fmtD(mon)} – ${fmtD(sun)}`
}

function isoWeekKey(dt: Date): string {
  const mon = new Date(dt)
  const day = mon.getDay()
  const diff = day === 0 ? -6 : 1 - day
  mon.setDate(mon.getDate() + diff)
  return mon.toISOString().slice(0,10)
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

function periodLabel(p: PeriodStr, from: number, to: number, fromYear?: number, toYear?: number): string {
  if (p === 'ytd') return 'YTD'
  if (p === 'range') {
    const fy = fromYear ?? 2026, ty = toYear ?? 2026
    const fStr = `${MONTHS[from]} ${fy}`
    const tStr = `${MONTHS[to]} ${ty}`
    return fStr === tStr ? fStr : `${fStr} – ${tStr}`
  }
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

function parseFundingsRows(rows: CsvRow[], source: 'sg' | 'd2c' | 'all' = 'all'): MARecord[] {
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
        ytdFamiliesSG: 0, ytdVolumeSG: 0, ytdFamiliesD2C: 0, ytdVolumeD2C: 0,
        monthlyFamilies: Array(12).fill(0) as number[], monthlyVolume: Array(12).fill(0) as number[],
        monthlyFamiliesSG: Array(12).fill(0) as number[], monthlyVolumeSG: Array(12).fill(0) as number[],
        monthlyFamiliesD2C: Array(12).fill(0) as number[], monthlyVolumeD2C: Array(12).fill(0) as number[],
        monthlyRespaApps: Array(12).fill(0) as number[], monthlyInitialApps: Array(12).fill(0) as number[],
        ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0, ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0,
        monthlyRespaAppsSG: Array(12).fill(0) as number[], monthlyRespaAppsD2C: Array(12).fill(0) as number[],
        monthlyInitialAppsSG: Array(12).fill(0) as number[], monthlyInitialAppsD2C: Array(12).fill(0) as number[],
      })
    }
    const rec = map.get(maKey)!
    if (mo >= 0) { rec.monthlyFamilies[mo] += 1; rec.monthlyVolume[mo] += vol }
    rec.ytdFamilies += 1; rec.ytdVolume += vol
    if (source === 'sg') { if (mo >= 0) { rec.monthlyFamiliesSG[mo] += 1; rec.monthlyVolumeSG[mo] += vol } rec.ytdFamiliesSG += 1; rec.ytdVolumeSG += vol }
    if (source === 'd2c') { if (mo >= 0) { rec.monthlyFamiliesD2C[mo] += 1; rec.monthlyVolumeD2C[mo] += vol } rec.ytdFamiliesD2C += 1; rec.ytdVolumeD2C += vol }
  }
  return Array.from(map.values())
}

function parseFundingsWeekly(rows: CsvRow[], source: 'sg'|'d2c'): Map<string, { label: string; byBranch: BranchFundEntry[] }> {
  const map = new Map<string, { label: string; total: { [branch: string]: { fam: number; vol: number } } }>()
  for (const row of rows) {
    const dateRaw = row['Funded Date'] ?? row['Close Date'] ?? row['Closing Date'] ?? row['Date'] ?? ''
    if (!dateRaw) continue
    const dt = parseDate(dateRaw as string)
    if (!dt) continue
    const vol = parseFloat(String(row['Loan Amount'] ?? row['Volume'] ?? row['Amount'] ?? '0').replace(/[$,]/g, '')) || 0
    const maSupport = String(row['Assigned MA Support'] ?? '').trim()
    const lc = maSupport || String(row['Assigned LC'] ?? '').trim()
    if (!lc) continue
    const branch = branchForMA(lc)
    const wk = isoWeekKey(dt)
    const lbl = isoWeekLabel(dt)
    if (!map.has(wk)) map.set(wk, { label: lbl, total: {} })
    const entry = map.get(wk)!
    if (!entry.total[branch]) entry.total[branch] = { fam: 0, vol: 0 }
    entry.total[branch].fam += 1
    entry.total[branch].vol += vol
  }
  const result = new Map<string, { label: string; byBranch: BranchFundEntry[] }>()
  for (const [wk, v] of map.entries()) {
    const byBranch = Object.entries(v.total)
      .map(([branch, d]) => ({ branch, families: d.fam, volume: d.vol }))
      .sort((a, b) => b.families - a.families)
    result.set(wk, { label: v.label, byBranch })
  }
  return result
}

function parseAppsRows(rows: CsvRow[], source?: 'sg'|'d2c'): Map<string, { respa: number[]; initial: number[]; respaBySource: { sg: number[]; d2c: number[] }; initialBySource: { sg: number[]; d2c: number[] } }> {
  const map = new Map<string, { respa: number[]; initial: number[]; respaBySource: { sg: number[]; d2c: number[] }; initialBySource: { sg: number[]; d2c: number[] } }>()
  for (const row of rows) {
    const maSupport = String(row['Assigned MA Support'] ?? '').trim()
    const lc = maSupport || String(row['Assigned LC'] ?? '').trim()
    if (!lc) continue
    const maKey = normName(lc)
    if (!map.has(maKey)) map.set(maKey, {
      respa: Array(12).fill(0) as number[],
      initial: Array(12).fill(0) as number[],
      respaBySource: { sg: Array(12).fill(0) as number[], d2c: Array(12).fill(0) as number[] },
      initialBySource: { sg: Array(12).fill(0) as number[], d2c: Array(12).fill(0) as number[] },
    })
    const rec = map.get(maKey)!
    // If Application created at is filled → RESPA. Otherwise → Initial (Loan File Created date).
    const respaDateRaw = String(row['Application created at'] ?? row['Application Date'] ?? row['App Date'] ?? '').trim()
    if (respaDateRaw) {
      const dt = parseDate(respaDateRaw)
      const mo = dt ? dt.getMonth() : -1
      if (mo >= 0) {
        rec.respa[mo] += 1
        if (source) rec.respaBySource[source][mo] += 1
      }
    } else {
      const initDateRaw = String(row['Loan File Created'] ?? row['Loan file created at'] ?? row['File Created'] ?? row['Loan Created'] ?? '').trim()
      if (initDateRaw) {
        const dt = parseDate(initDateRaw)
        const mo = dt ? dt.getMonth() : -1
        if (mo >= 0) {
          rec.initial[mo] += 1
          if (source) rec.initialBySource[source][mo] += 1
        }
      }
    }
  }
  return map
}

function parseAppsWeekly(rows: CsvRow[], source: 'sg'|'d2c'): Map<string, MaWeekEntry[]> {
  // Returns: weekKey -> array of MA entries with respa+initial counts for that week
  const map = new Map<string, { [maName: string]: { respa: number; initial: number } }>()
  for (const row of rows) {
    const maSupport = String(row['Assigned MA Support'] ?? '').trim()
    const lc = maSupport || String(row['Assigned LC'] ?? '').trim()
    if (!lc) continue
    const appDateRaw = String(row['Application created at'] ?? row['Application Date'] ?? row['App Date'] ?? '').trim()
    const loanDateRaw = String(row['Loan File Created'] ?? row['Loan file created at'] ?? row['File Created'] ?? row['Loan Created'] ?? '').trim()
    // RESPA if app date filled; Initial if app date empty and loan date filled
    const isRespa = !!appDateRaw
    const dateRaw = isRespa ? appDateRaw : loanDateRaw
    if (!dateRaw) continue
    const dt = parseDate(dateRaw)
    if (!dt) continue
    const wk = isoWeekKey(dt)
    if (!map.has(wk)) map.set(wk, {})
    const wkEntry = map.get(wk)!
    if (!wkEntry[lc]) wkEntry[lc] = { respa: 0, initial: 0 }
    if (isRespa) wkEntry[lc].respa += 1
    else wkEntry[lc].initial += 1
  }
  const result = new Map<string, MaWeekEntry[]>()
  for (const [wk, byMA] of map.entries()) {
    const entries = Object.entries(byMA)
      .map(([name, v]) => ({ name, respa: v.respa, initial: v.initial }))
      .sort((a, b) => (b.respa + b.initial) - (a.respa + a.initial))
    result.set(wk, entries)
  }
  return result
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
  const fmtFam = (n: number) => `${n} ${n === 1 ? 'family' : 'families'}`
  const fmtApp = (n: number) => `${n} Initial ${n === 1 ? 'App' : 'Apps'}`
  const fmtDollar = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  function branchDisplayName(b: string): string {
    if (b === 'DiGregorio Branch') return 'DiGregorio/Balentine Branch'
    return b
  }

  const weeks = [...weeklyData].sort((a, b) => {
    const ka = a.weekStart ?? a.weekLabel
    const kb = b.weekStart ?? b.weekLabel
    return ka < kb ? -1 : ka > kb ? 1 : 0
  })

  const lines: string[] = []

  // ── Narrative opener (most recent vs prior week) ──
  if (weeks.length >= 2) {
    const cur = weeks[weeks.length - 1]
    const prev = weeks[weeks.length - 2]
    const respaChg = cur.respaApps - prev.respaApps
    const respaChgPct = prev.respaApps > 0 ? Math.round((respaChg / prev.respaApps) * 100) : 0
    const volChg = cur.volume - prev.volume
    const volChgPct = prev.volume > 0 ? Math.round((volChg / prev.volume) * 100) : 0
    const initChg = cur.initialApps - prev.initialApps
    const minInit = Math.min(...weeks.map(w => w.initialApps))
    const curIsMinInit = cur.initialApps <= minInit

    const direction = respaChg >= 0 ? 'rebounded' : 'pulled back'
    const initNote = curIsMinInit
      ? `Initial Apps fell to ${cur.initialApps}, the lowest week in the entire ${weeks.length}-week window.`
      : initChg >= 0
      ? `Initial Apps picked up to ${cur.initialApps} (+${initChg} WoW).`
      : `Initial Apps slipped to ${cur.initialApps} (${initChg} WoW).`

    lines.push(
      `RESPA ${direction} this week — ${cur.respaApps} families/${fmtDollar(cur.volume).replace(/\.00$/, '')}, ` +
      `${respaChg >= 0 ? 'up' : 'down'} from ${prev.respaApps}/${fmtDollar(prev.volume).replace(/\.00$/, '')} last week ` +
      `(${respaChgPct >= 0 ? '+' : ''}${respaChgPct}% families, ${volChgPct >= 0 ? '+' : ''}${volChgPct}% $). ` +
      initNote
    )
    lines.push('')
    lines.push('')
  } else if (weeks.length === 1) {
    const cur = weeks[0]
    lines.push(`Week of ${cur.weekLabel} — ${cur.respaApps} RESPA families / $${(cur.volume/1e6).toFixed(1)}M, ${cur.initialApps} Initial Apps.`)
    lines.push('')
    lines.push('')
  }

  // ── One block per week (most recent first) ──
  for (const w of [...weeks].reverse()) {
    const sgRespa = w.sgRespaByBranch ?? []
    const d2cRespa = w.d2cRespaByBranch ?? []
    const sgInit = w.sgInitialByBranch ?? []
    const d2cInit = w.d2cInitialByBranch ?? []

    const sgRespaFam = sgRespa.reduce((s, e) => s + e.families, 0)
    const sgRespaVol = sgRespa.reduce((s, e) => s + e.volume, 0)
    const d2cRespaFam = d2cRespa.reduce((s, e) => s + e.families, 0)
    const d2cRespaVol = d2cRespa.reduce((s, e) => s + e.volume, 0)
    const sgInitTotal = sgInit.reduce((s, e) => s + e.count, 0)
    const d2cInitTotal = d2cInit.reduce((s, e) => s + e.count, 0)

    const hasSGD2C = sgRespa.length > 0 || d2cRespa.length > 0 || sgInit.length > 0 || d2cInit.length > 0
    const totalFam = hasSGD2C ? sgRespaFam + d2cRespaFam : w.families
    const totalVol = hasSGD2C ? sgRespaVol + d2cRespaVol : w.volume
    const totalInit = hasSGD2C ? sgInitTotal + d2cInitTotal : w.initialApps

    lines.push(`${w.weekLabel} – Total – ${fmtFam(totalFam)} - ${fmtDollar(totalVol)}`)
    lines.push('')

    if (sgRespa.length > 0) {
      lines.push(`Self Gen Leads RESPA – ${fmtFam(sgRespaFam)} - ${fmtDollar(sgRespaVol)}`)
      lines.push('')
      for (const e of sgRespa) {
        lines.push(`${branchDisplayName(e.branch)} – ${fmtFam(e.families)} - ${fmtDollar(e.volume)}`)
      }
      lines.push('')
    }

    if (d2cRespa.length > 0) {
      lines.push(`Better Leads RESPA – ${fmtFam(d2cRespaFam)} - ${fmtDollar(d2cRespaVol)}`)
      lines.push('')
      for (const e of d2cRespa) {
        lines.push(`${branchDisplayName(e.branch)} – ${fmtFam(e.families)} - ${fmtDollar(e.volume)}`)
      }
      lines.push('')
    }

    if (!hasSGD2C) {
      lines.push(`RESPA Files – ${fmtFam(w.families)} - ${fmtDollar(w.volume)}`)
      lines.push('')
    }

    lines.push(`Initial Apps – Total ${totalInit}`)
    lines.push('')

    if (sgInit.length > 0) {
      lines.push(`Self Gen Initial Apps – ${sgInitTotal} Initial Apps`)
      lines.push('')
      for (const e of sgInit) {
        lines.push(`${branchDisplayName(e.branch)} – ${fmtApp(e.count)}`)
      }
      lines.push('')
    }

    if (d2cInit.length > 0) {
      lines.push(`Better Leads Initial Apps – ${d2cInitTotal} Initial Apps`)
      lines.push('')
      for (const e of d2cInit) {
        lines.push(`${branchDisplayName(e.branch)} – ${fmtApp(e.count)}`)
      }
      lines.push('')
    }

    if (!hasSGD2C && (w.respaApps > 0 || w.initialApps > 0)) {
      lines.push(`(Upload SG and D2C reports to see source breakdown)`)
      lines.push('')
    }

    lines.push('')
  }

  // ── Individual MA breakdown ──
  lines.push(`Individual Breakdown`)
  lines.push('')
  const sorted = [...maData]
    .filter(m => m.ytdRespaApps + m.ytdInitialApps > 0)
    .sort((a, b) => b.ytdRespaApps - a.ytdRespaApps)
  for (const ma of sorted) {
    const bc = BRANCH_CONFIG.find(b => b.members.some(m => nameSimilar(m, ma.name)))
    lines.push(
      `${ma.name} (${bc?.name ?? 'Solo'}) – RESPA: ${ma.ytdRespaApps} YTD | ` +
      `Self-Gen: ${ma.ytdFamiliesSG} families / ${fmtDollar(ma.ytdVolumeSG)} | ` +
      `D2C: ${ma.ytdFamiliesD2C} families / ${fmtDollar(ma.ytdVolumeD2C)} | ` +
      `Initial: ${ma.ytdInitialApps} YTD`
    )
  }
  lines.push('')
  lines.push('— NEO FinFree Division')
  return lines.join('\n')
}

function buildProductionEmailBody(maData: MARecord[], mo: number): string {
  const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthName = FULL_MONTHS[mo]
  const div = '═'.repeat(48)
  const thin = '─'.repeat(48)

  const teamFam = maData.reduce((s, m) => s + (m.monthlyFamilies[mo] ?? 0), 0)
  const teamVol = maData.reduce((s, m) => s + (m.monthlyVolume[mo] ?? 0), 0)

  const branches = groupMAByBranch(maData)
  const sorted = [...maData]
    .filter(m => (m.monthlyFamilies[mo] ?? 0) > 0)
    .sort((a, b) => (b.monthlyFamilies[mo] ?? 0) - (a.monthlyFamilies[mo] ?? 0))
  const top3 = sorted.slice(0, 3)
  const medals = ['🥇', '🥈', '🥉']

  const lines: string[] = [
    `NEO HOME LOANS — FINFREE DIVISION`,
    `${monthName} 2026 Production Report`,
    div,
    ``,
    `DIVISION TOTAL`,
    thin,
    `  Families Funded:   ${teamFam}`,
    `  Total Volume:      ${fmtVolFull(teamVol)}`,
    ``,
    `TOP PRODUCERS`,
    thin,
  ]

  top3.forEach((ma, i) => {
    const f = ma.monthlyFamilies[mo] ?? 0
    const v = ma.monthlyVolume[mo] ?? 0
    lines.push(`  ${medals[i]}  ${ma.name}`)
    lines.push(`       ${f} ${f === 1 ? 'family' : 'families'}  ·  ${fmtVolFull(v)}`)
  })

  lines.push(``, `BRANCH RESULTS`, thin)
  for (const bg of branches) {
    const f = bg.members.reduce((s, m) => s + (m.monthlyFamilies[mo] ?? 0), 0)
    const v = bg.members.reduce((s, m) => s + (m.monthlyVolume[mo] ?? 0), 0)
    if (f === 0 && v === 0) continue
    lines.push(`  ${bg.name}`)
    lines.push(`    ${f} ${f === 1 ? 'family' : 'families'}  ·  ${fmtVolFull(v)}`)
    // MA breakdown within branch
    for (const ma of bg.members) {
      const mf = ma.monthlyFamilies[mo] ?? 0
      const mv = ma.monthlyVolume[mo] ?? 0
      if (mf === 0 && mv === 0) continue
      lines.push(`    · ${ma.name}  —  ${mf} ${mf === 1 ? 'family' : 'families'}  /  ${fmtVolFull(mv)}`)
    }
    lines.push(``)
  }

  lines.push(div, `NEO FinFree Division  ·  ${monthName} 2026`)
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

const RANGE_YEARS = [2024, 2025, 2026]

function RangeSelector({ from, fromYear, to, toYear, onChange }: {
  from: number; fromYear: number; to: number; toYear: number
  onChange: (f: number, fy: number, t: number, ty: number) => void
}) {
  const sel: React.CSSProperties = { padding: '6px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 13, color: C.text, background: C.white, cursor: 'pointer', outline: 'none' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.white, border: `1px solid ${C.border}`, borderRadius: 9, padding: '4px 12px' }}>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>FROM</span>
      <select value={from} onChange={e => onChange(Number(e.target.value), fromYear, to, toYear)} style={sel}>
        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <select value={fromYear} onChange={e => onChange(from, Number(e.target.value), to, toYear)} style={sel}>
        {RANGE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginLeft: 4 }}>TO</span>
      <select value={to} onChange={e => onChange(from, fromYear, Number(e.target.value), toYear)} style={sel}>
        {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
      </select>
      <select value={toYear} onChange={e => onChange(from, fromYear, to, Number(e.target.value))} style={sel}>
        {RANGE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
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
function BranchProductionTab({ maData, prevYearData, onFundingsUpload, onPrevYearUpload }: {
  maData: MARecord[]
  prevYearData: MARecord[]
  onFundingsUpload: (file: File) => void
  onPrevYearUpload: (file: File) => void
}) {
  const [period, setPeriod] = useState<PeriodStr>('ytd')
  const [rangeFrom, setRangeFrom] = useState(0)
  const [rangeFromYear, setRangeFromYear] = useState(2026)
  const [rangeTo, setRangeTo] = useState(6)
  const [rangeToYear, setRangeToYear] = useState(2026)
  const [source, setSource] = useState<'all'|'sg'|'d2c'>('all')
  const [fundLoading, setFundLoading] = useState(false)
  const [fundMsg, setFundMsg] = useState('')
  const [prevLoading, setPrevLoading] = useState(false)
  const [prevMsg, setPrevMsg] = useState('')
  const [emailMonth, setEmailMonth] = useState(5)
  const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const [fr, to] = periodRange(period, rangeFrom, rangeTo)

  function famArr(m: MARecord) { return source === 'sg' ? m.monthlyFamiliesSG : source === 'd2c' ? m.monthlyFamiliesD2C : m.monthlyFamilies }
  function volArr(m: MARecord) { return source === 'sg' ? m.monthlyVolumeSG : source === 'd2c' ? m.monthlyVolumeD2C : m.monthlyVolume }

  const hasPrevYear = prevYearData.length > 0

  // Map a calendar year to the right MARecord list
  function dataForYear(year: number): MARecord[] {
    if (year <= 2025) return prevYearData
    return maData
  }

  // Sum across a potentially cross-year date range
  function sumCrossYear(ma: MARecord, frM: number, frY: number, toM: number, toY: number, type: 'fam'|'vol'): number {
    let total = 0
    for (let y = frY; y <= toY; y++) {
      const startM = y === frY ? frM : 0
      const endM = y === toY ? toM : 11
      const src = dataForYear(y).find(p => nameSimilar(p.name, ma.name)) ?? ma
      const arr = type === 'fam' ? famArr(src) : volArr(src)
      for (let m = startM; m <= endM; m++) total += arr[m] ?? 0
    }
    return total
  }

  // Unified per-MA value respecting period type
  function maFam(m: MARecord) {
    return period === 'range' ? sumCrossYear(m, rangeFrom, rangeFromYear, rangeTo, rangeToYear, 'fam') : sumMonths(famArr(m), fr, to)
  }
  function maVol(m: MARecord) {
    return period === 'range' ? sumCrossYear(m, rangeFrom, rangeFromYear, rangeTo, rangeToYear, 'vol') : sumMonths(volArr(m), fr, to)
  }

  const totalFamilies = maData.reduce((s, m) => s + maFam(m), 0)
  const totalVolume = maData.reduce((s, m) => s + maVol(m), 0)

  const sorted = [...maData].sort((a, b) => maVol(b) - maVol(a))
  const maxVolume = Math.max(...sorted.map(m => maVol(m)), 1)
  const maxFamilies = Math.max(...sorted.map(m => maFam(m)), 1)

  // MoM: compare the end month of the selected period vs the month before it,
  // using the correct year's data (not always current year)
  const momEndMonth = to   // month index at the end of the selected period
  const momEndYear = period === 'range' ? rangeToYear : 2026

  // Previous month: cross year boundary if Jan
  const momPrevMonth = momEndMonth > 0 ? momEndMonth - 1 : 11
  const momPrevYear = momEndMonth > 0 ? momEndYear : momEndYear - 1

  const momMonthLabel = `${MONTHS[momPrevMonth]} → ${MONTHS[momEndMonth]}`

  function momCalc(ma: MARecord, type: 'vol'|'fam'): number | null {
    const curSrc = dataForYear(momEndYear).find(p => nameSimilar(p.name, ma.name)) ?? ma
    const prevSrc = dataForYear(momPrevYear).find(p => nameSimilar(p.name, ma.name)) ?? ma
    const curArr = type === 'fam' ? famArr(curSrc) : volArr(curSrc)
    const prevArr = type === 'fam' ? famArr(prevSrc) : volArr(prevSrc)
    const curVal = curArr[momEndMonth] ?? 0
    const prevVal = prevArr[momPrevMonth] ?? 0
    if (prevVal === 0) return null
    return Math.round(((curVal - prevVal) / prevVal) * 100)
  }

  // YTY: same period range but from prevYearData
  function prevYearVal(name: string, type: 'vol'|'fam') {
    const py = prevYearData.find(m => nameSimilar(m.name, name))
    if (!py) return null
    if (period === 'range') {
      // shift both years back by 1
      return sumCrossYear(py, rangeFrom, rangeFromYear - 1, rangeTo, rangeToYear - 1, type)
    }
    return type === 'vol' ? sumMonths(volArr(py), fr, to) : sumMonths(famArr(py), fr, to)
  }

  function ytyPct(cur: number, prev: number | null) {
    if (prev === null || prev === 0) return null
    return Math.round(((cur - prev) / prev) * 100)
  }

  const sourceOpts: ToggleOption[] = [{ id: 'all', label: 'All' }, { id: 'sg', label: 'Self-Gen' }, { id: 'd2c', label: 'D2C' }]

  const teamFamilies = MONTHS.map((_, i) => maData.reduce((s, m) => s + famArr(m)[i], 0))
  const teamVolume = MONTHS.map((_, i) => maData.reduce((s, m) => s + volArr(m)[i], 0))
  const prevTeamFamilies = hasPrevYear ? MONTHS.map((_, i) => prevYearData.reduce((s, m) => s + famArr(m)[i], 0)) : undefined
  const prevTeamVolume = hasPrevYear ? MONTHS.map((_, i) => prevYearData.reduce((s, m) => s + volArr(m)[i], 0)) : undefined

  const prodSubject = `${FULL_MONTHS[emailMonth]} Production Numbers`
  const prodBody = buildProductionEmailBody(maData, emailMonth)

  function TrendChip({ pct, label }: { pct: number | null; label?: string }) {
    if (pct === null) return <span style={{ fontSize: 11, color: C.muted }}>—</span>
    const up = pct >= 0
    return (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 12,
        background: up ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
        color: up ? C.green : C.red,
        whiteSpace: 'nowrap',
      }}>
        {up ? '▲' : '▼'} {Math.abs(pct)}%{label ? ` ${label}` : ''}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <ToggleGroup options={PERIOD_OPTS} value={period} onChange={v => setPeriod(v as PeriodStr)} />
        {period === 'range' && <RangeSelector from={rangeFrom} fromYear={rangeFromYear} to={rangeTo} toYear={rangeToYear} onChange={(f,fy,t,ty) => { setRangeFrom(f); setRangeFromYear(fy); setRangeTo(t); setRangeToYear(ty) }} />}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <ToggleGroup options={sourceOpts} value={source} onChange={v => setSource(v as 'all'|'sg'|'d2c')} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1px solid ${C.border}`, borderRadius: 9, overflow: 'hidden', background: C.white }}>
            <select value={emailMonth} onChange={e => setEmailMonth(Number(e.target.value))} style={{ padding: '8px 10px', border: 'none', fontSize: 13, color: C.navy, fontWeight: 600, background: 'transparent', cursor: 'pointer', outline: 'none' }}>
              {FULL_MONTHS.slice(0, 7).map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <EmailReportButton subject={prodSubject} body={prodBody} label="Email Report" />
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiTile label="Families Helped" value={String(totalFamilies)} sub={periodLabel(period, rangeFrom, rangeTo, rangeFromYear, rangeToYear)} />
        <KpiTile label="Total Volume" value={fmtVol(totalVolume)} sub={periodLabel(period, rangeFrom, rangeTo, rangeFromYear, rangeToYear)} />
        {hasPrevYear && (() => {
          const pyFam = prevYearData.reduce((s, m) => s + maFam(m), 0)
          const pyVol = prevYearData.reduce((s, m) => s + maVol(m), 0)
          const famPct = ytyPct(totalFamilies, pyFam)
          const volPct = ytyPct(totalVolume, pyVol)
          return (
            <>
              <KpiTile label="Prior Year Families" value={String(pyFam)} sub="Same period last year" />
              <KpiTile label="YTY Volume Change" value={volPct !== null ? `${volPct >= 0 ? '+' : ''}${volPct}%` : '—'} sub="vs same period last year" />
              <KpiTile label="YTY Families Change" value={famPct !== null ? `${famPct >= 0 ? '+' : ''}${famPct}%` : '—'} sub="vs same period last year" />
            </>
          )
        })()}
      </div>

      {/* Team charts: volume + families, with prior year overlay if uploaded */}
      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <CardHead title="Monthly Volume" subtitle={hasPrevYear ? 'Current year vs prior year' : 'All team members'} />
          <HoverBarChart values={teamVolume} labels={MONTHS} color="#7c3aed" fmt={fmtVol} primaryLabel="This Year" secondValues={prevTeamVolume} secondColor="#a78bfa" secondLabel="Last Year" />
        </Card>
        <Card style={{ flex: 1 }}>
          <CardHead title="Monthly Families" subtitle={hasPrevYear ? 'Current year vs prior year' : 'All team members'} />
          <HoverBarChart values={teamFamilies} labels={MONTHS} color={C.accent} fmt={String} primaryLabel="This Year" secondValues={prevTeamFamilies} secondColor="#93c5fd" secondLabel="Last Year" />
        </Card>
      </div>

      {/* Leaderboard */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px minmax(140px, 220px) 160px 130px 130px 200px', gap: 0, padding: '10px 20px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>#</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>ADVISOR</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'right' }}>VOLUME</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'right' }}>FAMILIES</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'right' }}>MO/MO ({momMonthLabel})</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textAlign: 'right' }}>CHANGEMAKER</div>
        </div>

        {sorted.map((ma, i) => {
          const vol = maVol(ma)
          const fam = maFam(ma)
          const volBarPct = vol / maxVolume
          const momVolPct = momCalc(ma, 'vol')
          const momFamPct = momCalc(ma, 'fam')
          const pyVol = prevYearVal(ma.name, 'vol')
          const pyFam = prevYearVal(ma.name, 'fam')
          const ytyV = ytyPct(vol, pyVol)
          const ytyF = ytyPct(fam, pyFam)
          const projFam = Math.round(ma.ytdFamilies * PROJ_FACTOR)
          const projVol = Math.round(ma.ytdVolume * PROJ_FACTOR)
          const cmStatus = getIndivStatus(ma.ytdVolume, ma.ytdFamilies)
          const rank = i + 1
          const isTop3 = rank <= 3
          const rankLabel = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank)
          const rowBg = rank === 1 ? 'rgba(245,158,11,0.04)' : C.white

          return (
            <div key={ma.name} style={{ background: rowBg, borderBottom: `1px solid ${C.bg}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px minmax(140px, 220px) 160px 130px 130px 200px', gap: 0, padding: '14px 20px', alignItems: 'center' }}>

                {/* Rank */}
                <div style={{ fontSize: isTop3 ? 20 : 13, fontWeight: 800, color: C.muted, textAlign: 'center' }}>{rankLabel}</div>

                {/* Name + bar */}
                <div style={{ paddingRight: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.navy, marginBottom: 6 }}>{ma.name}</div>
                  <div style={{ height: 5, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${volBarPct * 100}%`, height: '100%', background: isTop3 ? '#7c3aed' : '#a78bfa', borderRadius: 3, transition: 'width 0.4s' }} />
                  </div>
                </div>

                {/* Volume */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>{fmtVol(vol)}</div>
                  {hasPrevYear && <div style={{ marginTop: 3 }}><TrendChip pct={ytyV} label="YTY" /></div>}
                </div>

                {/* Families */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{fam}</div>
                  {hasPrevYear && <div style={{ marginTop: 3 }}><TrendChip pct={ytyF} label="YTY" /></div>}
                </div>

                {/* MoM */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>Vol</span>
                      <TrendChip pct={momVolPct} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>Fam</span>
                      <TrendChip pct={momFamPct} />
                    </div>
                  </div>
                </div>

                {/* Changemaker */}
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge status={cmStatus} />
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 5 }}>
                    {fmtVol(projVol)} · {projFam} fam
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Upload section */}
      <div style={{ display: 'flex', gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <CardHead title="Upload Fundings" subtitle="YTD fundings export — source detected from Lead Source field" />
          <UploadZone
            label="Drop YTD Fundings CSV / XLSX"
            onFile={async (f) => {
              setFundLoading(true)
              try { await onFundingsUpload(f); setFundMsg(`Loaded ${f.name}`) }
              catch { setFundMsg('Error reading file') }
              setFundLoading(false)
            }}
            loading={fundLoading} message={fundMsg}
          />
        </Card>
        <Card style={{ flex: 1 }}>
          <CardHead title="Upload Prior Year" subtitle="Same report format from 2025 — used for YTY trend comparison" />
          <UploadZone
            label="Drop 2025 Fundings CSV / XLSX"
            onFile={async (f) => {
              setPrevLoading(true)
              try { await onPrevYearUpload(f); setPrevMsg(`Loaded ${f.name}`) }
              catch { setPrevMsg('Error reading file') }
              setPrevLoading(false)
            }}
            loading={prevLoading} message={prevMsg}
          />
        </Card>
      </div>
    </div>
  )
}

// ─── Applications Tab ─────────────────────────────────────────────────────────
function ApplicationsTab({ maData, weeklyData, onAppsUpload, onWeekUpload, onClearApps }: {
  maData: MARecord[]
  weeklyData: WeeklyRow[]
  onAppsUpload: (file: File, source: 'sg'|'d2c') => void
  onWeekUpload: (file: File) => void
  onClearApps: () => void
}) {
  const [subView, setSubView] = useState('branch')
  const [period, setPeriod] = useState<PeriodStr>('ytd')
  const [rangeFrom, setRangeFrom] = useState(0)
  const [rangeFromYear, setRangeFromYear] = useState(2026)
  const [rangeTo, setRangeTo] = useState(6)
  const [rangeToYear, setRangeToYear] = useState(2026)
  const [appMetric, setAppMetric] = useState('both')
  const [appSource, setAppSource] = useState<'all'|'sg'|'d2c'>('all')
  const [weekLoading, setWeekLoading] = useState(false)
  const [weekMsg, setWeekMsg] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(BRANCH_CONFIG.map(b => b.name)))
  const sortedWeeks = [...weeklyData].sort((a,b) => { const ka = a.weekStart ?? a.weekLabel; const kb = b.weekStart ?? b.weekLabel; return ka > kb ? -1 : ka < kb ? 1 : 0 })
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0)
  const [weeklySource, setWeeklySource] = useState<'all'|'sg'|'d2c'>('all')
  const [sgLoading, setSgLoading] = useState(false)
  const [sgMsg, setSgMsg] = useState('')
  const [d2cLoading, setD2cLoading] = useState(false)
  const [d2cMsg, setD2cMsg] = useState('')

  const [fr, to] = periodRange(period, rangeFrom, rangeTo)
  const branches = groupMAByBranch(maData)

  function respaArr(m: MARecord) { return appSource === 'sg' ? m.monthlyRespaAppsSG : appSource === 'd2c' ? m.monthlyRespaAppsD2C : m.monthlyRespaApps }
  function initArr(m: MARecord) { return appSource === 'sg' ? m.monthlyInitialAppsSG : appSource === 'd2c' ? m.monthlyInitialAppsD2C : m.monthlyInitialApps }

  const teamRespa = MONTHS.map((_, i) => maData.reduce((s, m) => s + respaArr(m)[i], 0))
  const teamInitial = MONTHS.map((_, i) => maData.reduce((s, m) => s + initArr(m)[i], 0))

  function toggleBranch(name: string) {
    setExpanded(prev => { const n = new Set(prev); if (n.has(name)) n.delete(name); else n.add(name); return n })
  }

  const curWeek = weeklyData[weeklyData.length - 1]
  const prevWeek = weeklyData[weeklyData.length - 2]

  const subViewOpts: ToggleOption[] = [{ id: 'branch', label: 'By Branch & MA' }, { id: 'weekly', label: 'Weekly Tracking' }]
  const appMetricOpts: ToggleOption[] = [{ id: 'respa', label: 'RESPA Apps' }, { id: 'initial', label: 'Initial Apps' }, { id: 'both', label: 'Both' }]
  const appSourceOpts: ToggleOption[] = [{ id: 'all', label: 'All' }, { id: 'sg', label: 'Self-Gen' }, { id: 'd2c', label: 'D2C' }]

  const appsSubject = `RESPA files & Initial Apps ${new Date().toLocaleDateString('en-US')}`
  const appsBody = buildAppsEmailBody(maData, weeklyData)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <ToggleGroup options={subViewOpts} value={subView} onChange={setSubView} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => { if (confirm('Clear all application data? This cannot be undone.')) onClearApps() }}
            style={{ padding: '8px 14px', background: '#fff', border: '1px solid #E4E8EC', borderRadius: 8, fontSize: 13, color: '#B0504A', fontWeight: 600, cursor: 'pointer' }}
          >Clear All</button>
          <EmailReportButton subject={appsSubject} body={appsBody} label="Email Report" />
        </div>
      </div>

      {subView === 'branch' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <ToggleGroup options={PERIOD_OPTS} value={period} onChange={v => setPeriod(v as PeriodStr)} />
            {period === 'range' && <RangeSelector from={rangeFrom} fromYear={rangeFromYear} to={rangeTo} toYear={rangeToYear} onChange={(f,fy,t,ty) => { setRangeFrom(f); setRangeFromYear(fy); setRangeTo(t); setRangeToYear(ty) }} />}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <ToggleGroup options={appMetricOpts} value={appMetric} onChange={setAppMetric} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Source:</span>
                <ToggleGroup options={appSourceOpts} value={appSource} onChange={v => setAppSource(v as 'all'|'sg'|'d2c')} />
              </div>
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
              const brRespa = branch.members.reduce((s, m) => s + sumMonths(respaArr(m), fr, to), 0)
              const brInitial = branch.members.reduce((s, m) => s + sumMonths(initArr(m), fr, to), 0)
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
                        const maRespa = sumMonths(respaArr(ma), fr, to)
                        const maInit = sumMonths(initArr(ma), fr, to)
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
            <Card style={{ flex: 1, borderTop: '3px solid #16a34a' }}>
              <CardHead title="Upload Self-Gen Applications" subtitle="One report for all SG apps — RESPA and Initial pulled by date field" />
              <UploadZone
                label="Drop Self-Gen Applications CSV / XLSX"
                onFile={async (f) => {
                  setSgLoading(true)
                  try { await onAppsUpload(f, 'sg'); setSgMsg(`Loaded ${f.name}`) }
                  catch { setSgMsg('Error reading file') }
                  setSgLoading(false)
                }}
                loading={sgLoading} message={sgMsg}
              />
            </Card>
            <Card style={{ flex: 1, borderTop: '3px solid #7c3aed' }}>
              <CardHead title="Upload D2C Applications" subtitle="One report for all D2C apps — RESPA and Initial pulled by date field" />
              <UploadZone
                label="Drop D2C Applications CSV / XLSX"
                onFile={async (f) => {
                  setD2cLoading(true)
                  try { await onAppsUpload(f, 'd2c'); setD2cMsg(`Loaded ${f.name}`) }
                  catch { setD2cMsg('Error reading file') }
                  setD2cLoading(false)
                }}
                loading={d2cLoading} message={d2cMsg}
              />
            </Card>
          </div>
        </>
      )}

      {subView === 'weekly' && (() => {
        const selWeek = sortedWeeks[selectedWeekIdx]
        const prevWeek = sortedWeeks[selectedWeekIdx + 1]
        if (!selWeek) return <Card><div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 24 }}>Upload SG and D2C reports to populate weekly tracking.</div></Card>

        // Merge SG + D2C MA lists for "All" view
        function mergeMALists(sgList: MaWeekEntry[], d2cList: MaWeekEntry[]): MaWeekEntry[] {
          const map: { [name: string]: MaWeekEntry } = {}
          for (const e of [...sgList, ...d2cList]) {
            if (!map[e.name]) map[e.name] = { name: e.name, respa: 0, initial: 0 }
            map[e.name].respa += e.respa
            map[e.name].initial += e.initial
          }
          return Object.values(map).sort((a,b) => (b.respa+b.initial)-(a.respa+a.initial))
        }

        const sgList = selWeek.sgByMA ?? []
        const d2cList = selWeek.d2cByMA ?? []
        const prevSgList = prevWeek?.sgByMA ?? []
        const prevD2cList = prevWeek?.d2cByMA ?? []

        const activeList = weeklySource === 'sg' ? sgList : weeklySource === 'd2c' ? d2cList : mergeMALists(sgList, d2cList)
        const prevActiveList = weeklySource === 'sg' ? prevSgList : weeklySource === 'd2c' ? prevD2cList : mergeMALists(prevSgList, prevD2cList)

        const sourceColor = weeklySource === 'sg' ? '#16a34a' : weeklySource === 'd2c' ? '#7c3aed' : C.navy
        const totalRespa = activeList.reduce((s,e)=>s+e.respa,0)
        const totalInit = activeList.reduce((s,e)=>s+e.initial,0)
        const prevTotalRespa = prevActiveList.reduce((s,e)=>s+e.respa,0)
        const prevTotalInit = prevActiveList.reduce((s,e)=>s+e.initial,0)

        const weeklySourceOpts: ToggleOption[] = [{ id: 'all', label: 'All' }, { id: 'sg', label: 'Self-Gen' }, { id: 'd2c', label: 'D2C' }]

        return (
          <>
            {/* Controls row: week selector + source toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <select
                  value={selectedWeekIdx}
                  onChange={e => setSelectedWeekIdx(Number(e.target.value))}
                  style={{ padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.navy, background: C.white, cursor: 'pointer', outline: 'none' }}
                >
                  {sortedWeeks.map((w, i) => (
                    <option key={w.weekLabel} value={i}>{w.weekLabel}{i === 0 ? ' (Latest)' : ''}</option>
                  ))}
                </select>
                {prevWeek && <span style={{ fontSize: 13, color: C.muted }}>vs. {prevWeek.weekLabel}</span>}
              </div>
              <ToggleGroup options={weeklySourceOpts} value={weeklySource} onChange={v => setWeeklySource(v as 'all'|'sg'|'d2c')} />
            </div>

            {/* KPI row */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <KpiTile label="RESPA Apps" value={String(totalRespa)} sub={prevWeek ? `${totalRespa - prevTotalRespa >= 0 ? '+' : ''}${totalRespa - prevTotalRespa} WoW` : selWeek.weekLabel} />
              <KpiTile label="Initial Apps" value={String(totalInit)} sub={prevWeek ? `${totalInit - prevTotalInit >= 0 ? '+' : ''}${totalInit - prevTotalInit} WoW` : selWeek.weekLabel} />
              {weeklySource !== 'd2c' && selWeek.volume > 0 && <KpiTile label="Volume" value={fmtVol(selWeek.volume)} sub={selWeek.weekLabel} />}
            </div>

            {/* Branch + MA breakdown */}
            {activeList.length > 0 ? (
              <Card style={{ borderTop: `3px solid ${sourceColor}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.navy }}>
                    {weeklySource === 'sg' ? 'Self-Gen' : weeklySource === 'd2c' ? 'D2C' : 'All Sources'}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span style={{ color: '#7c3aed', fontWeight: 700 }}>{totalRespa} RESPA</span>
                    <span style={{ color: C.accent, fontWeight: 700 }}>{totalInit} Initial</span>
                  </div>
                </div>
                {BRANCH_CONFIG.map(bc => {
                  const members = activeList.filter(e => bc.members.some(m => nameSimilar(m, e.name)))
                  const prevMembers = prevActiveList.filter(e => bc.members.some(m => nameSimilar(m, e.name)))
                  if (!members.length) return null
                  const brRespa = members.reduce((s,e)=>s+e.respa,0)
                  const brInit = members.reduce((s,e)=>s+e.initial,0)
                  const prevBrRespa = prevMembers.reduce((s,e)=>s+e.respa,0)
                  const prevBrInit = prevMembers.reduce((s,e)=>s+e.initial,0)
                  return (
                    <div key={bc.name} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.borderSoft}` }}>
                        <div style={{ width: 4, height: 28, borderRadius: 2, background: bc.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: C.navy }}>{bc.name}</div>
                        <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>
                          {brRespa} RESPA{prevWeek && <span style={{ fontWeight: 400, color: C.muted }}> ({brRespa-prevBrRespa>=0?'+':''}{brRespa-prevBrRespa})</span>}
                        </div>
                        <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginLeft: 12 }}>
                          {brInit} Initial{prevWeek && <span style={{ fontWeight: 400, color: C.muted }}> ({brInit-prevBrInit>=0?'+':''}{brInit-prevBrInit})</span>}
                        </div>
                      </div>
                      {members.map(ma => {
                        const prev = prevMembers.find(p => nameSimilar(p.name, ma.name))
                        // For "All" view, also show SG/D2C split per MA
                        const sgEntry = weeklySource === 'all' ? sgList.find(e => nameSimilar(e.name, ma.name)) : null
                        const d2cEntry = weeklySource === 'all' ? d2cList.find(e => nameSimilar(e.name, ma.name)) : null
                        return (
                          <div key={ma.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0 5px 20px', borderBottom: `1px solid ${C.bg}` }}>
                            <div style={{ flex: 1, fontSize: 13, color: C.text }}>{ma.name}</div>
                            {weeklySource === 'all' ? (
                              <>
                                {(sgEntry?.respa ?? 0) > 0 && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{sgEntry!.respa}R SG</div>}
                                {(sgEntry?.initial ?? 0) > 0 && <div style={{ fontSize: 12, color: '#16a34a' }}>{sgEntry!.initial}I SG</div>}
                                {(d2cEntry?.respa ?? 0) > 0 && <div style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600 }}>{d2cEntry!.respa}R D2C</div>}
                                {(d2cEntry?.initial ?? 0) > 0 && <div style={{ fontSize: 12, color: '#7c3aed' }}>{d2cEntry!.initial}I D2C</div>}
                                <div style={{ fontSize: 13, color: C.navy, fontWeight: 700, marginLeft: 4 }}>{ma.respa + ma.initial} total</div>
                              </>
                            ) : (
                              <>
                                {ma.respa > 0 && <div style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>{ma.respa} RESPA{prev && <span style={{ fontWeight: 400, color: C.muted }}> ({ma.respa-(prev.respa??0)>=0?'+':''}{ma.respa-(prev.respa??0)})</span>}</div>}
                                {ma.initial > 0 && <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginLeft: 8 }}>{ma.initial} Initial{prev && <span style={{ fontWeight: 400, color: C.muted }}> ({ma.initial-(prev.initial??0)>=0?'+':''}{ma.initial-(prev.initial??0)})</span>}</div>}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </Card>
            ) : (
              <Card><div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: 24 }}>No data for this week / source. Upload SG and D2C reports to populate.</div></Card>
            )}
          </>
        )
      })()}
    </div>
  )
}

// ─── Changemaker helpers ──────────────────────────────────────────────────────
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

// ─── Root Production component ────────────────────────────────────────────────
export default function Production() {
  const [maData, setMaData] = useState<MARecord[]>(SEED_MA)
  const [weeklyData, setWeeklyData] = useState<WeeklyRow[]>(SEED_WEEKLY)
  const [prevYearData, setPrevYearData] = useState<MARecord[]>([])
  const [activeTab, setActiveTab] = useState<'branch'|'apps'>('branch')

  const handlePrevYearUpload = useCallback(async (file: File) => {
    const rows = await readRows(file)
    const sgRows = rows.filter(r => rowSource(r) === 'sg')
    const d2cRows = rows.filter(r => rowSource(r) === 'd2c')
    const parsedSG = parseFundingsRows(sgRows.length ? sgRows : rows, sgRows.length ? 'sg' : 'all')
    const parsedD2C = parseFundingsRows(d2cRows, 'd2c')
    const merged: MARecord[] = []
    const all = [...parsedSG, ...parsedD2C]
    for (const p of all) {
      const idx = merged.findIndex(m => nameSimilar(m.name, p.name))
      if (idx >= 0) {
        merged[idx] = {
          ...merged[idx],
          ytdFamilies: merged[idx].ytdFamilies + p.ytdFamilies,
          ytdVolume: merged[idx].ytdVolume + p.ytdVolume,
          monthlyFamilies: merged[idx].monthlyFamilies.map((v,i) => v + p.monthlyFamilies[i]),
          monthlyVolume: merged[idx].monthlyVolume.map((v,i) => v + p.monthlyVolume[i]),
        }
      } else {
        merged.push({ ...p })
      }
    }
    setPrevYearData(merged)
  }, [])

  function rowSource(row: CsvRow): 'sg' | 'd2c' {
    const s = String(row['Lead Source'] ?? row['Source'] ?? row['Channel'] ?? row['Loan Source'] ?? row['Lead Type'] ?? '').toLowerCase()
    return /d2c|better|direct/.test(s) ? 'd2c' : 'sg'
  }

  const handleFundingsUpload = useCallback(async (file: File) => {
    const rows = await readRows(file)
    const sgRows = rows.filter(r => rowSource(r) === 'sg')
    const d2cRows = rows.filter(r => rowSource(r) === 'd2c')
    const parsedSG = parseFundingsRows(sgRows.length ? sgRows : rows, sgRows.length ? 'sg' : 'all')
    const parsedD2C = parseFundingsRows(d2cRows, 'd2c')
    const weeklySG = parseFundingsWeekly(sgRows.length ? sgRows : rows, 'sg')
    const weeklyD2C = parseFundingsWeekly(d2cRows, 'd2c')

    setMaData(prev => {
      const next = [...prev]
      for (const src of ['sg', 'd2c'] as const) {
        const list = src === 'sg' ? parsedSG : parsedD2C
        for (const p of list) {
          const idx = next.findIndex(m => nameSimilar(m.name, p.name))
          if (idx >= 0) {
            const other = src === 'sg' ? next[idx].ytdFamiliesD2C : next[idx].ytdFamiliesSG
            const otherVol = src === 'sg' ? next[idx].ytdVolumeD2C : next[idx].ytdVolumeSG
            const otherFamArr = src === 'sg' ? next[idx].monthlyFamiliesD2C : next[idx].monthlyFamiliesSG
            const otherVolArr = src === 'sg' ? next[idx].monthlyVolumeD2C : next[idx].monthlyVolumeSG
            const thisFam = src === 'sg' ? p.ytdFamiliesSG : p.ytdFamiliesD2C
            const thisVol = src === 'sg' ? p.ytdVolumeSG : p.ytdVolumeD2C
            const thisFamArr = src === 'sg' ? p.monthlyFamiliesSG : p.monthlyFamiliesD2C
            const thisVolArr = src === 'sg' ? p.monthlyVolumeSG : p.monthlyVolumeD2C
            next[idx] = {
              ...next[idx],
              ytdFamilies: other + thisFam,
              ytdVolume: otherVol + thisVol,
              monthlyFamilies: thisFamArr.map((v, i) => v + (otherFamArr[i] ?? 0)),
              monthlyVolume: thisVolArr.map((v, i) => v + (otherVolArr[i] ?? 0)),
              ...(src === 'sg' ? { ytdFamiliesSG: p.ytdFamiliesSG, ytdVolumeSG: p.ytdVolumeSG, monthlyFamiliesSG: p.monthlyFamiliesSG, monthlyVolumeSG: p.monthlyVolumeSG } : {}),
              ...(src === 'd2c' ? { ytdFamiliesD2C: p.ytdFamiliesD2C, ytdVolumeD2C: p.ytdVolumeD2C, monthlyFamiliesD2C: p.monthlyFamiliesD2C, monthlyVolumeD2C: p.monthlyVolumeD2C } : {}),
            }
          } else {
            const fam = src === 'sg' ? p.ytdFamiliesSG : p.ytdFamiliesD2C
            const vol = src === 'sg' ? p.ytdVolumeSG : p.ytdVolumeD2C
            next.push({ ...p, ytdFamilies: fam, ytdVolume: vol, monthlyFamilies: src === 'sg' ? p.monthlyFamiliesSG : p.monthlyFamiliesD2C, monthlyVolume: src === 'sg' ? p.monthlyVolumeSG : p.monthlyVolumeD2C })
          }
        }
      }
      return next
    })

    for (const [src, weeklyParsed] of [['sg', weeklySG], ['d2c', weeklyD2C]] as const) {
      if (weeklyParsed.size > 0) {
        setWeeklyData(prev => {
          const next = prev.map(w => ({ ...w }))
          for (const [wk, v] of weeklyParsed.entries()) {
            const idx = next.findIndex(w => w.weekStart === wk || w.weekLabel === v.label)
            if (idx >= 0) {
              if (src === 'sg') next[idx] = { ...next[idx], sgRespaByBranch: v.byBranch, weekStart: wk, families: (next[idx].d2cRespaByBranch ?? []).reduce((s,e)=>s+e.families,0) + v.byBranch.reduce((s,e)=>s+e.families,0), volume: (next[idx].d2cRespaByBranch ?? []).reduce((s,e)=>s+e.volume,0) + v.byBranch.reduce((s,e)=>s+e.volume,0) }
              else next[idx] = { ...next[idx], d2cRespaByBranch: v.byBranch, weekStart: wk, families: (next[idx].sgRespaByBranch ?? []).reduce((s,e)=>s+e.families,0) + v.byBranch.reduce((s,e)=>s+e.families,0), volume: (next[idx].sgRespaByBranch ?? []).reduce((s,e)=>s+e.volume,0) + v.byBranch.reduce((s,e)=>s+e.volume,0) }
            } else {
              const totalFam = v.byBranch.reduce((s,e)=>s+e.families,0)
              const totalVol = v.byBranch.reduce((s,e)=>s+e.volume,0)
              next.push({ weekLabel: v.label, weekStart: wk, families: totalFam, volume: totalVol, respaApps: totalFam, initialApps: 0, ...(src === 'sg' ? { sgRespaByBranch: v.byBranch } : { d2cRespaByBranch: v.byBranch }) })
            }
          }
          return next.sort((a, b) => { const ka = a.weekStart ?? a.weekLabel; const kb = b.weekStart ?? b.weekLabel; return ka < kb ? -1 : ka > kb ? 1 : 0 })
        })
      }
    }
  }, [])

  const handleAppsUpload = useCallback(async (file: File, source: 'sg'|'d2c') => {
    const rows = await readRows(file)
    const parsed = parseAppsRows(rows, source)
    setMaData(prev => {
      const next = [...prev]
      parsed.forEach((appData, maKey) => {
        const idx = next.findIndex(m => normName(m.name) === maKey || nameSimilar(m.name, maKey))
        if (idx >= 0) {
          const existingSG = source === 'sg'
          const sgRespa = existingSG ? appData.respaBySource.sg : next[idx].monthlyRespaAppsSG
          const d2cRespa = existingSG ? next[idx].monthlyRespaAppsD2C : appData.respaBySource.d2c
          const sgInit = existingSG ? appData.initialBySource.sg : next[idx].monthlyInitialAppsSG
          const d2cInit = existingSG ? next[idx].monthlyInitialAppsD2C : appData.initialBySource.d2c
          next[idx] = {
            ...next[idx],
            monthlyRespaAppsSG: sgRespa,
            monthlyRespaAppsD2C: d2cRespa,
            monthlyInitialAppsSG: sgInit,
            monthlyInitialAppsD2C: d2cInit,
            monthlyRespaApps: sgRespa.map((v, i) => v + d2cRespa[i]),
            monthlyInitialApps: sgInit.map((v, i) => v + d2cInit[i]),
            ytdRespaAppsSG: sgRespa.reduce((a,b)=>a+b,0),
            ytdRespaAppsD2C: d2cRespa.reduce((a,b)=>a+b,0),
            ytdInitialAppsSG: sgInit.reduce((a,b)=>a+b,0),
            ytdInitialAppsD2C: d2cInit.reduce((a,b)=>a+b,0),
            ytdRespaApps: sgRespa.reduce((a,b)=>a+b,0) + d2cRespa.reduce((a,b)=>a+b,0),
            ytdInitialApps: sgInit.reduce((a,b)=>a+b,0) + d2cInit.reduce((a,b)=>a+b,0),
          }
        }
      })
      return next
    })
    const weeklyMA = parseAppsWeekly(rows, source)
    setWeeklyData(prev => {
      const next = prev.map(w => ({ ...w }))
      for (const [wk, maEntries] of weeklyMA.entries()) {
        const idx = next.findIndex(w => w.weekStart === wk)
        const totalRespa = maEntries.reduce((s,e)=>s+e.respa,0)
        const totalInit = maEntries.reduce((s,e)=>s+e.initial,0)
        // Derive branch-level counts from MA entries
        const byBranchRespa: { [b: string]: number } = {}
        const byBranchInit: { [b: string]: number } = {}
        for (const e of maEntries) {
          const b = branchForMA(e.name)
          byBranchRespa[b] = (byBranchRespa[b] ?? 0) + e.respa
          byBranchInit[b] = (byBranchInit[b] ?? 0) + e.initial
        }
        const respaByBranch = Object.entries(byBranchRespa).filter(([,v])=>v>0).map(([branch,families])=>({ branch, families, volume: 0 })).sort((a,b)=>b.families-a.families)
        const initByBranch = Object.entries(byBranchInit).filter(([,v])=>v>0).map(([branch,count])=>({ branch, count })).sort((a,b)=>b.count-a.count)
        if (idx >= 0) {
          const updates = source === 'sg'
            ? { sgByMA: maEntries, sgRespaByBranch: respaByBranch, sgInitialByBranch: initByBranch }
            : { d2cByMA: maEntries, d2cRespaByBranch: respaByBranch, d2cInitialByBranch: initByBranch }
          next[idx] = { ...next[idx], ...updates }
          const sgR = (next[idx].sgRespaByBranch ?? []).reduce((s,e)=>s+e.families,0)
          const d2cR = (next[idx].d2cRespaByBranch ?? []).reduce((s,e)=>s+e.families,0)
          const sgI = (next[idx].sgInitialByBranch ?? []).reduce((s,e)=>s+e.count,0)
          const d2cI = (next[idx].d2cInitialByBranch ?? []).reduce((s,e)=>s+e.count,0)
          next[idx] = { ...next[idx], respaApps: sgR + d2cR, initialApps: sgI + d2cI }
        } else {
          next.push({
            weekLabel: isoWeekLabel(new Date(wk + 'T12:00:00')), weekStart: wk,
            families: 0, volume: 0, respaApps: totalRespa, initialApps: totalInit,
            ...(source === 'sg' ? { sgByMA: maEntries, sgRespaByBranch: respaByBranch, sgInitialByBranch: initByBranch } : { d2cByMA: maEntries, d2cRespaByBranch: respaByBranch, d2cInitialByBranch: initByBranch }),
          })
        }
      }
      return next.sort((a,b) => { const ka = a.weekStart ?? a.weekLabel; const kb = b.weekStart ?? b.weekLabel; return ka < kb ? -1 : ka > kb ? 1 : 0 })
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

  const handleClearApps = useCallback(() => {
    setMaData(prev => prev.map(m => ({
      ...m,
      ytdRespaApps: 0, ytdInitialApps: 0,
      ytdRespaAppsSG: 0, ytdRespaAppsD2C: 0,
      ytdInitialAppsSG: 0, ytdInitialAppsD2C: 0,
      monthlyRespaApps: Array(12).fill(0) as number[],
      monthlyInitialApps: Array(12).fill(0) as number[],
      monthlyRespaAppsSG: Array(12).fill(0) as number[],
      monthlyRespaAppsD2C: Array(12).fill(0) as number[],
      monthlyInitialAppsSG: Array(12).fill(0) as number[],
      monthlyInitialAppsD2C: Array(12).fill(0) as number[],
    })))
    setWeeklyData(prev => prev.map(w => ({
      ...w,
      respaApps: 0, initialApps: 0,
      sgRespaByBranch: undefined, d2cRespaByBranch: undefined,
      sgInitialByBranch: undefined, d2cInitialByBranch: undefined,
    })))
  }, [])

  const tabOpts: Array<{ id: 'branch'|'apps'; label: string }> = [
    { id: 'branch', label: 'Production' },
    { id: 'apps', label: 'Applications' },
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

      {activeTab === 'branch' && <BranchProductionTab maData={maData} prevYearData={prevYearData} onFundingsUpload={handleFundingsUpload} onPrevYearUpload={handlePrevYearUpload} />}
      {activeTab === 'apps' && <ApplicationsTab maData={maData} weeklyData={weeklyData} onAppsUpload={(f, s) => handleAppsUpload(f, s)} onWeekUpload={handleWeekUpload} onClearApps={handleClearApps} />}
    </div>
  )
}
