export type OnboardingRole = 'MA' | 'LSCA' | 'PP'
export type EmployeeStatus = 'onboarding' | 'active' | 'terminated'
export type ProfileRole = 'admin' | 'member'
export type ProfileStatus = 'pending' | 'approved'

export interface Profile {
  id: string
  full_name: string
  email: string
  title: string
  role: ProfileRole
  status: ProfileStatus
  created_at: string
}

export interface Employee {
  id: string
  name: string
  onboarding_role: OnboardingRole
  status: EmployeeStatus
  title: string
  team: string
  work_email: string
  personal_email: string
  phone: string
  address: string
  dob: string | null
  work_anniversary: string | null
  start_date: string | null
  spouse: string
  spouse_anniversary: string | null
  nmls_number: string
  licensed_states: string
  assigned_ma: string
  equipment: string
  notes: string
  headshot_url: string | null
  termination_date: string | null
  termination_reason: string
  created_at: string
  updated_at: string
}

export interface EmployeeChild {
  id: string
  employee_id: string
  name: string
}

export interface CoachingNote {
  id: string
  employee_id: string
  body: string
  author_name: string
  created_at: string
}

export interface Win {
  id: string
  employee_id: string
  body: string
  author_name: string
  created_at: string
}

export interface ChecklistCompletion {
  employee_id: string
  item_id: string
  completed_by: string
  completed_at: string
}

export interface ChecklistItem {
  id: string
  text: string
  note?: string
  cost?: string
  roles?: OnboardingRole[]
  action?: 'welcomeEmail' | 'gptEmail'
}

export interface ChecklistSection {
  id: string
  title: string
  roles: 'all' | OnboardingRole[]
  note?: string
  tech?: boolean
  items: ChecklistItem[]
}
