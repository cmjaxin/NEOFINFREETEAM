import { ChecklistSection, OnboardingRole } from './types'

export const CHECKLIST: ChecklistSection[] = [
  {
    id: 'prior',
    title: 'Prior to Starting',
    roles: 'all',
    items: [
      { id: 'prior_equip_ship', text: 'The week before — confirm equipment is shipping, get tracking info from HR, and follow up on delivery' },
      { id: 'prior_equip_verify', text: 'Reach out to verify they received their equipment once delivery is confirmed' },
      { id: 'prior_nmls', text: 'Collect list of NMLS states they are licensed in', note: 'If applicable — MA & PP roles', roles: ['MA', 'PP'] },
      { id: 'prior_book', text: 'Send Extreme Ownership book' },
    ],
  },
  {
    id: 'startday',
    title: 'Start Day — All Roles',
    roles: 'all',
    items: [
      { id: 'sd_intro', text: 'Intro to Josh and Barbara' },
      { id: 'sd_welcome_email', text: 'Welcome email to entire division' },
      { id: 'sd_welcome_letter', text: 'Send the division welcome letter', note: 'Opens Outlook pre-filled — edit the wording under Templates.', action: 'welcomeEmail' },
      { id: 'sd_poc', text: 'Send list with points of contact for all areas', note: 'Include payroll, benefits, HR, and leadership within the division' },
      { id: 'sd_distro', text: 'Add to applicable distribution lists', note: 'NEO FinFree LO Only · NEO FinFree Division · NEO FinFree Mettle Local · NEO FinFree Mettle Ops · NEO FinFree OPS' },
      { id: 'sd_email_distro', text: 'Add to team email distribution group', note: 'Add to the FinFree division email distribution list so they receive all team communications' },
      { id: 'sd_teams_channels', text: 'Add to Microsoft Teams channels', note: 'Add to all applicable Teams channels for their role — general division channel plus any role-specific channels' },
    ],
  },
  {
    id: 'ma',
    title: 'MA Checklist',
    roles: ['MA'],
    items: [
      { id: 'ma_meetings', text: 'Add to weekly MA meeting, Daily Gratitude, and CCI training (Calendar)' },
      { id: 'ma_gpts', text: 'Send the FinFree custom GPTs email', note: 'Opens Outlook pre-filled with the GPT links for them to pin in ChatGPT.', action: 'gptEmail' },
      { id: 'ma_colin', text: 'Set meeting with Colin to go over BNTouch and Marketing' },
      { id: 'ma_licensing', text: 'Ensure licensing is switching over and they can be assigned in Tinman' },
      { id: 'ma_jacky', text: 'Notify Jacky of Podding for Tinman Auto Assignment' },
      { id: 'ma_teams', text: "Add to FinFree All LO's Teams chat" },
      { id: 'ma_payroll', text: "Add to Robyn's payroll list for hour submission" },
    ],
  },
  {
    id: 'lsca',
    title: 'LS / CA Checklist',
    roles: ['LSCA'],
    items: [
      { id: 'ls_gabrielle', text: 'Introduction to Gabrielle' },
      { id: 'ls_shadow', text: 'Determine shadow person and introduce' },
      { id: 'ls_team', text: 'Assign to team and do introduction meeting' },
      { id: 'ls_leaders', text: 'Add to the Meet the Leaders meeting for Ops', note: 'Nichole, Corey, Devin, etc.' },
      { id: 'ls_ops', text: 'Add to any ops meetings for the division' },
      { id: 'ls_teams', text: 'Intro to group chats in Teams' },
      { id: 'ls_mastermind', text: 'Add to NEO mastermind trainings pertinent to their role' },
      { id: 'ls_tinman', text: 'Ensure they can be assigned in Tinman' },
      { id: 'ls_jacky', text: 'Notify Jacky of Podding for Tinman Auto Assignment' },
    ],
  },
  {
    id: 'pp',
    title: 'PP Checklist',
    roles: ['PP'],
    items: [
      { id: 'pp_intro', text: 'Introduction to Barbara and Gabrielle' },
      { id: 'pp_shadow', text: 'Determine shadow person and introduce' },
      { id: 'pp_license', text: "If licensed, ensure it's getting transferred to NEO" },
      { id: 'pp_ma', text: 'Introduction to MA once assigned' },
      { id: 'pp_ops', text: 'Add to any ops meetings for the division' },
      { id: 'pp_mastermind', text: 'Add to NEO Mastermind trainings' },
      { id: 'pp_tinman', text: 'Ensure they can be assigned in Tinman' },
      { id: 'pp_teams', text: 'Intro to group chats in Teams' },
      { id: 'pp_colin', text: 'Notify Colin of Podding for BNTouch' },
      { id: 'pp_jacky', text: 'Notify Jacky of Podding for Tinman Auto Assignment' },
    ],
  },
  {
    id: 'tech',
    title: 'Tech Program Signups',
    roles: ['MA'],
    tech: true,
    note: 'When an MA is onboarded, ask which programs they want and send details to Eddie Huh. Note: Better may now handle this — mainly verify they get set up with everything.',
    items: [
      { id: 'tech_canva', text: 'Canva sign-up', cost: '$10/mo' },
      { id: 'tech_homereport', text: 'Highway Products — Home Report', cost: '$75/mo' },
      { id: 'tech_mbs', text: 'Highway Products — MBS Highway', cost: '$59/mo' },
      { id: 'tech_listreports', text: 'Highway Products — List Reports', cost: '$125/mo' },
      { id: 'tech_experience', text: 'Experience.com sign-up', cost: '$25/mo' },
      { id: 'tech_coach', text: 'Mortgage Coach sign-up', cost: '$105/mo' },
      { id: 'tech_finlocker', text: 'NEO Experience App / FinLocker sign-up', cost: '$150/mo' },
      { id: 'tech_homebinder', text: 'HomeBinder + HomeBinder Assistance sign-up', cost: '$40/mo' },
      { id: 'tech_youcanbookme', text: 'YouCanBookMe sign-up', cost: '$10/mo' },
      { id: 'tech_spoke', text: 'Spoke / Twilio sign-up', cost: '$25/mo' },
      { id: 'tech_retr', text: 'RETR sign-up', cost: '$60/mo' },
    ],
  },
]

export function sectionsFor(role: OnboardingRole): ChecklistSection[] {
  return CHECKLIST
    .filter(s => s.roles === 'all' || (s.roles as OnboardingRole[]).includes(role))
    .map(s => ({
      ...s,
      items: s.items.filter(it => !it.roles || it.roles.includes(role)),
    }))
}

export function allItemsFor(role: OnboardingRole) {
  return sectionsFor(role).flatMap(s => s.items)
}

export const DEFAULT_WELCOME = `Hello {name}!

Welcome to the FinFree division at NEO, powered by Better. We're so glad to have you!

I am the Administrative Assistant for the division and Executive Assistant to the division president, Josh Mettle.

The first few days are usually filled with SO much info, so I won't bombard you with too many details. I just wanted to reach out and see if you have everything you need for the moment. I'll check in with you later, but in the meantime, please reach out for any questions or needs — if I don't know the answer, I'll find the right person to ask.

Breathe deep & enjoy your first week!

Talk soon,
{sender}`

export const EXTREME_OWNERSHIP_MSG = `Welcome to the team! You're joining a group that believes in serving clients at an elite level, and taking full ownership of the outcomes we create. We're fired up you're here and excited to see the impact you'll make!`

export const GPTS_EMAIL_SUBJECT = 'FinFree Custom GPTs — pin these in ChatGPT'
export const GPTS_EMAIL_BODY = `Hey team! Below is our custom GPTs we have created for FinFree!

Highly suggest if you have not done so, click the link and pin these to your ChatGPT custom GPTs!

https://chatgpt.com/g/g-68f035afd1e8819188cfb0eeabf254eb-better-heloc-income-analysis-underwriting-guide

https://chatgpt.com/g/g-68ed7af17e488191b01dce0028de9da3-neo-dpa-guideline-master

https://chatgpt.com/g/g-68ea606698948191bb6138d69f5bf870-finfree-appraisal-guru

https://chatgpt.com/g/g-68b338794eec8191b461173a28b343d4-wholesale-loan-guidelines-deal-desk

https://chatgpt.com/g/g-68a4617eed5481919e8698250960f0bf-second-mortgage-master

https://chatgpt.com/g/g-68949436691081918a54a9086ac414ff-loan-atlas-ai-sales-coach`

export const WELCOME_EMAIL_SUBJECT = 'Welcome to the FinFree Division!'
