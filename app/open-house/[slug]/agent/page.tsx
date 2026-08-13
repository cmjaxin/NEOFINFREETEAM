import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import AgentPageClient from './PageClient'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('open_house_pages')
    .select('address, city, state')
    .eq('slug', slug)
    .eq('page_type', 'open_house')
    .eq('status', 'active')
    .single()

  const title = data
    ? `${data.address} — Agent Resources | NEO Home Loans`
    : 'Agent Resources | NEO Home Loans'

  return { title, robots: 'noindex' }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <AgentPageClient slug={slug} />
}
