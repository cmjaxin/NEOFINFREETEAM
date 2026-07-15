'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from './supabase/client'
import { Employee, EmployeeChild, CoachingNote, Win, ChecklistCompletion, Profile, OnboardingRole } from './types'
import { sectionsFor, allItemsFor } from './checklist'

type View = 'dashboard' | 'directory' | 'terminated' | 'profile' | 'templates' | 'production' | 'wins'

interface AppState {
  profile: Profile | null
  employees: Employee[]
  children: Record<string, EmployeeChild[]>
  coaching: Record<string, CoachingNote[]>
  wins: Record<string, Win[]>
  completions: Record<string, ChecklistCompletion[]>
  welcomeTemplate: string
  pendingProfiles: Profile[]
  view: View
  selectedId: string | null
  profileTab: 'profile' | 'onboarding'
  profileFrom: View
  showAdd: boolean
  showSettings: boolean
  search: string
  dirSearch: string
  roleFilter: string
}

interface AppContextValue extends AppState {
  supabase: ReturnType<typeof createClient>
  setView: (v: View) => void
  setSelectedId: (id: string | null) => void
  setProfileTab: (t: 'profile' | 'onboarding') => void
  setProfileFrom: (v: View) => void
  setShowAdd: (v: boolean) => void
  setShowSettings: (v: boolean) => void
  setSearch: (v: string) => void
  setDirSearch: (v: string) => void
  setRoleFilter: (v: string) => void
  reload: () => Promise<void>
  reloadEmployee: (id: string) => Promise<void>
  progress: (emp: Employee) => { total: number; done: number; pct: number }
}

const AppContext = createContext<AppContextValue | null>(null)

const DEFAULT_WELCOME = `Hello {name}!

Welcome to the FinFree division at NEO, powered by Better. We're so glad to have you!

I am the Administrative Assistant for the division and Executive Assistant to the division president, Josh Mettle.

The first few days are usually filled with SO much info, so I won't bombard you with too many details. I just wanted to reach out and see if you have everything you need for the moment. I'll check in with you later, but in the meantime, please reach out for any questions or needs — if I don't know the answer, I'll find the right person to ask.

Breathe deep & enjoy your first week!

Talk soon,
{sender}`

export function AppProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const supabase = createClient()
  const [state, setState] = useState<AppState>({
    profile, employees: [], children: {}, coaching: {}, wins: {}, completions: {},
    welcomeTemplate: DEFAULT_WELCOME, pendingProfiles: [],
    view: 'dashboard', selectedId: null, profileTab: 'profile', profileFrom: 'dashboard',
    showAdd: false, showSettings: false, search: '', dirSearch: '', roleFilter: 'all',
  })

  const reload = useCallback(async () => {
    const [empRes, childRes, coachRes, winsRes, compRes, tplRes, pendingRes] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('employee_children').select('*'),
      supabase.from('coaching_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('wins').select('*').order('created_at', { ascending: false }),
      supabase.from('checklist_completions').select('*'),
      supabase.from('message_templates').select('*').eq('key', 'welcome').single(),
      profile.role === 'admin'
        ? supabase.from('profiles').select('*').eq('status', 'pending')
        : Promise.resolve({ data: [] }),
    ])
    const empList: Employee[] = empRes.data ?? []
    const childMap: Record<string, EmployeeChild[]> = {}
    const coachMap: Record<string, CoachingNote[]> = {}
    const winMap: Record<string, Win[]> = {}
    const compMap: Record<string, ChecklistCompletion[]> = {}
    for (const c of (childRes.data ?? [])) {
      if (!childMap[c.employee_id]) childMap[c.employee_id] = []
      childMap[c.employee_id].push(c)
    }
    for (const c of (coachRes.data ?? [])) {
      if (!coachMap[c.employee_id]) coachMap[c.employee_id] = []
      coachMap[c.employee_id].push(c)
    }
    for (const w of (winsRes.data ?? [])) {
      if (!winMap[w.employee_id]) winMap[w.employee_id] = []
      winMap[w.employee_id].push(w)
    }
    for (const c of (compRes.data ?? [])) {
      if (!compMap[c.employee_id]) compMap[c.employee_id] = []
      compMap[c.employee_id].push(c)
    }
    setState(s => ({
      ...s,
      employees: empList,
      children: childMap,
      coaching: coachMap,
      wins: winMap,
      completions: compMap,
      welcomeTemplate: (tplRes.data as any)?.body ?? DEFAULT_WELCOME,
      pendingProfiles: (pendingRes.data ?? []) as Profile[],
    }))
  }, [profile.role, supabase])

  const reloadEmployee = useCallback(async (id: string) => {
    const [empRes, childRes, coachRes, winsRes, compRes] = await Promise.all([
      supabase.from('employees').select('*').eq('id', id).single(),
      supabase.from('employee_children').select('*').eq('employee_id', id),
      supabase.from('coaching_notes').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
      supabase.from('wins').select('*').eq('employee_id', id).order('created_at', { ascending: false }),
      supabase.from('checklist_completions').select('*').eq('employee_id', id),
    ])
    setState(s => ({
      ...s,
      employees: s.employees.map(e => e.id === id ? (empRes.data ?? e) : e),
      children: { ...s.children, [id]: childRes.data ?? [] },
      coaching: { ...s.coaching, [id]: coachRes.data ?? [] },
      wins: { ...s.wins, [id]: winsRes.data ?? [] },
      completions: { ...s.completions, [id]: compRes.data ?? [] },
    }))
  }, [supabase])

  useEffect(() => { reload() }, [reload])

  const progress = useCallback((emp: Employee) => {
    const items = allItemsFor(emp.onboarding_role)
    const compList = state.completions[emp.id] ?? []
    const doneIds = new Set(compList.map(c => c.item_id))
    const done = items.filter(it => doneIds.has(it.id)).length
    return { total: items.length, done, pct: items.length ? done / items.length : 0 }
  }, [state.completions])

  const ctx: AppContextValue = {
    ...state,
    supabase,
    setView: (v) => setState(s => ({ ...s, view: v })),
    setSelectedId: (id) => setState(s => ({ ...s, selectedId: id })),
    setProfileTab: (t) => setState(s => ({ ...s, profileTab: t })),
    setProfileFrom: (v) => setState(s => ({ ...s, profileFrom: v })),
    setShowAdd: (v) => setState(s => ({ ...s, showAdd: v })),
    setShowSettings: (v) => setState(s => ({ ...s, showSettings: v })),
    setSearch: (v) => setState(s => ({ ...s, search: v })),
    setDirSearch: (v) => setState(s => ({ ...s, dirSearch: v })),
    setRoleFilter: (v) => setState(s => ({ ...s, roleFilter: v })),
    reload,
    reloadEmployee,
    progress,
  }

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
