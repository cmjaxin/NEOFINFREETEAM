import { redirect } from 'next/navigation'

export default function OldOpenHousePage({ params }: { params: { slug: string } }) {
  redirect(`/listing-presentation/${params.slug}`)
}
