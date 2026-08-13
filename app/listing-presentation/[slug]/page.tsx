import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import PageClient from './PageClient'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('open_house_pages')
    .select('address, city, state, list_price, description, photos')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!data) {
    return { title: 'Listing Presentation | NEO Home Loans' }
  }

  const location = [data.city, data.state].filter(Boolean).join(', ')
  const title = `${data.address}${location ? ', ' + location : ''} | NEO Home Loans`
  const price = data.list_price > 0
    ? `$${Math.round(data.list_price).toLocaleString()} · `
    : ''
  const description = data.description
    ? data.description.slice(0, 155)
    : `${price}${data.address}${location ? ', ' + location : ''}. View this listing presentation powered by NEO Home Loans.`
  const image = data.photos?.[0] ?? null

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: data.address }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <PageClient slug={slug} />
}
