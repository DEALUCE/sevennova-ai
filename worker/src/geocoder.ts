/**
 * Geocoder — US Census Bureau (primary) + Nominatim (fallback)
 *
 * Census Bureau uses TIGER/Line address interpolation — returns a point on the
 * correct side of the street, not the street centerline.
 * Nominatim fallback for addresses not in TIGER (rare in LA).
 */

export interface GeocoderResult {
  lat: number
  lon: number
  source: 'CENSUS_BUREAU' | 'NOMINATIM' | 'DEFAULT'
  match_address: string | null
  accuracy: 'EXACT' | 'INTERPOLATED' | 'APPROXIMATE' | 'DEFAULT'
  error?: string
}

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// LA City center — last resort fallback, never used silently
const LA_CENTER: GeocoderResult = {
  lat: 34.0522, lon: -118.2437,
  source: 'DEFAULT', match_address: null, accuracy: 'DEFAULT',
  error: 'All geocoders failed — using LA city center',
}

async function geocodeCensus(address: string): Promise<GeocoderResult | null> {
  try {
    const params = new URLSearchParams({
      address,
      benchmark: 'Public_AR_Current',
      format: 'json',
    })
    const res = await fetch(`${CENSUS_URL}?${params}`)
    if (!res.ok) return null

    const data = await res.json() as {
      result?: {
        addressMatches?: Array<{
          coordinates?: { x: number; y: number }
          matchedAddress?: string
          tigerLine?: { side?: string }
        }>
      }
    }
    const match = data.result?.addressMatches?.[0]
    if (!match?.coordinates) return null

    return {
      lat: match.coordinates.y,
      lon: match.coordinates.x,
      source: 'CENSUS_BUREAU',
      match_address: match.matchedAddress ?? null,
      // Census always interpolates along the road edge — parcel-side accurate
      accuracy: 'INTERPOLATED',
    }
  } catch { return null }
}

async function geocodeNominatim(address: string): Promise<GeocoderResult | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
    })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'SevenNova.ai/1.0 (info@sevennova.ai)' },
    })
    if (!res.ok) return null

    const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
    if (!data.length) return null

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      source: 'NOMINATIM',
      match_address: data[0].display_name,
      accuracy: 'APPROXIMATE',
    }
  } catch { return null }
}

export async function geocodeAddress(
  street: string,
  city: string,
  state: string,
  zipCode?: string,
): Promise<GeocoderResult> {
  const full = [street, city, state, zipCode].filter(Boolean).join(', ')

  const census = await geocodeCensus(full)
  if (census) return census

  const nom = await geocodeNominatim(full)
  if (nom) return nom

  return LA_CENTER
}
