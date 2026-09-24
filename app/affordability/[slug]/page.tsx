import { Metadata } from 'next'
import PageClient from './PageClient'

export const metadata: Metadata = {
  title: 'The Problem Isn\'t Home Prices. It\'s Affordability. | NEO Home Loans',
  description: 'Discover how seller-paid rate buydowns manufacture affordability for today\'s buyers.',
}

export default async function AffordabilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PageClient slug={slug} />
}
