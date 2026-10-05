// Utah MLS (WFRMLS) RESO OData v4 helper
// Auth: Bearer token via Authorization header
// Docs: https://vendor.utahrealestate.com/webapi/docs

export interface MLSListing {
  address: string
  city: string
  state: string
  zip: string
  list_price: number
  beds: number | null
  baths: number | null
  sqft: number | null
  lot_size: string
  year_built: number | null
  description: string
  status: string
  photos: string[]
}

export async function fetchMLSListing(mlsNumber: string, apiKey: string): Promise<MLSListing> {
  const base = 'https://resoapi.utahrealestate.com/reso/odata'
  const filter = encodeURIComponent(`ListingId eq '${mlsNumber}'`)
  const url = `${base}/Property?$filter=${filter}&$expand=Media&$top=1`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  })

  if (res.status === 401) throw new Error('Invalid API key — check your Utah MLS credentials')
  if (res.status === 404) throw new Error('Listing not found')
  if (!res.ok) throw new Error(`MLS API error ${res.status}`)

  const json = await res.json()
  const prop = json.value?.[0]
  if (!prop) throw new Error(`No listing found for MLS #${mlsNumber}`)

  const photos: string[] = (prop.Media ?? [])
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((a.Order as number) || 0) - ((b.Order as number) || 0))
    .map((m: Record<string, unknown>) => m.MediaURL as string)
    .filter(Boolean)

  const parseAddress = (prop: Record<string, string>) => {
    const num = prop.StreetNumber || ''
    const dir = prop.StreetDirPrefix || ''
    const name = prop.StreetName || ''
    const suffix = prop.StreetSuffix || ''
    const unit = prop.UnitNumber ? ` #${prop.UnitNumber}` : ''
    return [num, dir, name, suffix].filter(Boolean).join(' ') + unit
  }

  return {
    address: prop.UnparsedAddress || parseAddress(prop),
    city: prop.City || '',
    state: prop.StateOrProvince || 'UT',
    zip: prop.PostalCode || '',
    list_price: prop.ListPrice || 0,
    beds: prop.BedroomsTotal ?? null,
    baths: prop.BathroomsTotalInteger ?? null,
    sqft: prop.LivingArea ?? null,
    lot_size: prop.LotSizeAcres ? `${prop.LotSizeAcres} ac` : (prop.LotSizeSquareFeet ? `${Math.round(prop.LotSizeSquareFeet)} sqft` : ''),
    year_built: prop.YearBuilt ?? null,
    description: prop.PublicRemarks || '',
    status: prop.StandardStatus || 'Active',
    photos,
  }
}
