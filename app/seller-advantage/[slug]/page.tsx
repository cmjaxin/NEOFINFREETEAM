import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PageClient from './PageClient'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('seller_advantage_pages')
    .select('sales_price, scenarios')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Seller Advantage | NEO Home Loans' }

  const price = data.sales_price ? `$${Math.round(data.sales_price).toLocaleString()}` : ''
  const title = `Seller Advantage${price ? ' · ' + price : ''} | NEO Home Loans`
  const description = 'See how seller-paid rate reductions can dramatically lower your monthly payment and make homeownership more affordable.'

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <PageClient slug={slug} />
}
