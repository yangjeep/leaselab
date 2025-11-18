import type { MetadataRoute } from 'next'
import { fetchListings } from '@/lib/fetchListings'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
  const list = await fetchListings()
  const items = list.map(l => ({
    url: `${base}/properties/${l.slug}`,
    lastModified: new Date(),
  }))
  return [
    { url: `${base}/`, lastModified: new Date() },
    ...items,
  ]
}
