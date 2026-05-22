/**
 * OSM Overpass — Walkable Amenities
 *
 * Counts grocery stores, pharmacies, schools, parks, and restaurants
 * within defined radii around the property. Used as a walk-score proxy
 * when Walk Score API is unavailable.
 *
 * No API key required.
 */

export interface OSMAmenityResult {
  source: 'OSM_OVERPASS'
  grocery_within_half_mi: number
  pharmacy_within_quarter_mi: number
  school_within_half_mi: number
  park_within_quarter_mi: number
  restaurant_within_quarter_mi: number
  // Derived walkability score 0-100
  walkability_score: number
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const OVERPASS_URLS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]
const SOURCE_URL = 'https://www.openstreetmap.org'

// Haversine distance in miles
function distanceMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Walkability score: weighted sum of amenity counts within target radii
// Max 100 — thresholds based on Walk Score methodology
function computeWalkability(
  grocery: number,
  pharmacy: number,
  school: number,
  park: number,
  restaurant: number,
): number {
  const score =
    Math.min(25, grocery * 12) +
    Math.min(15, pharmacy * 15) +
    Math.min(15, school * 7) +
    Math.min(15, park * 15) +
    Math.min(30, restaurant * 3)
  return Math.round(Math.min(100, score))
}

export async function fetchAmenities(lat: number, lon: number): Promise<OSMAmenityResult> {
  const retrievedAt = new Date().toISOString()

  // One query covers all amenity types we care about
  // radius in meters: 800 = ~0.5mi, 400 = ~0.25mi
  const query = `[out:json][timeout:12];
(
  node["shop"~"supermarket|grocery|convenience|food"](around:800,${lat},${lon});
  way["shop"~"supermarket|grocery"](around:800,${lat},${lon});
  node["amenity"="pharmacy"](around:400,${lat},${lon});
  node["amenity"~"school|kindergarten|university|college"](around:800,${lat},${lon});
  way["amenity"~"school|kindergarten"](around:800,${lat},${lon});
  node["leisure"="park"](around:400,${lat},${lon});
  way["leisure"="park"](around:400,${lat},${lon});
  node["amenity"~"restaurant|cafe|fast_food|bar"](around:400,${lat},${lon});
);
out center;`

  try {
    let res: Response | null = null
    let lastError = ''
    for (const url of OVERPASS_URLS) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        })
        clearTimeout(timer)
        if (r.ok) { res = r; break }
        lastError = `Overpass ${url} returned ${r.status}`
      } catch (e) {
        clearTimeout(timer)
        lastError = String(e)
      }
    }

    if (!res) {
      return {
        source: 'OSM_OVERPASS',
        grocery_within_half_mi: 0, pharmacy_within_quarter_mi: 0,
        school_within_half_mi: 0, park_within_quarter_mi: 0,
        restaurant_within_quarter_mi: 0, walkability_score: 0,
        source_url: SOURCE_URL, retrieved_at: retrievedAt,
        status: 'ERROR',
        error: lastError,
      }
    }

    const data = await res.json() as {
      elements?: Array<{
        lat?: number; lon?: number
        center?: { lat: number; lon: number }
        tags?: Record<string, string>
      }>
    }

    const elements = data.elements ?? []

    let grocery = 0, pharmacy = 0, school = 0, park = 0, restaurant = 0

    for (const el of elements) {
      // Ways return a center point
      const eLat = el.lat ?? el.center?.lat
      const eLon = el.lon ?? el.center?.lon
      if (eLat == null || eLon == null) continue

      const d = distanceMi(lat, lon, eLat, eLon)
      const shop = el.tags?.shop ?? ''
      const amenity = el.tags?.amenity ?? ''
      const leisure = el.tags?.leisure ?? ''

      if (/supermarket|grocery|convenience|food/.test(shop) && d <= 0.5) grocery++
      else if (amenity === 'pharmacy' && d <= 0.25) pharmacy++
      else if (/school|kindergarten|university|college/.test(amenity) && d <= 0.5) school++
      else if (leisure === 'park' && d <= 0.25) park++
      else if (/restaurant|cafe|fast_food|bar/.test(amenity) && d <= 0.25) restaurant++
    }

    const hasAny = grocery + pharmacy + school + park + restaurant > 0

    return {
      source: 'OSM_OVERPASS',
      grocery_within_half_mi: grocery,
      pharmacy_within_quarter_mi: pharmacy,
      school_within_half_mi: school,
      park_within_quarter_mi: park,
      restaurant_within_quarter_mi: restaurant,
      walkability_score: computeWalkability(grocery, pharmacy, school, park, restaurant),
      source_url: SOURCE_URL,
      retrieved_at: retrievedAt,
      status: hasAny ? 'VERIFIED' : 'UNAVAILABLE',
    }
  } catch (e) {
    return {
      source: 'OSM_OVERPASS',
      grocery_within_half_mi: 0, pharmacy_within_quarter_mi: 0,
      school_within_half_mi: 0, park_within_quarter_mi: 0,
      restaurant_within_quarter_mi: 0, walkability_score: 0,
      source_url: SOURCE_URL, retrieved_at: retrievedAt,
      status: 'ERROR',
      error: String(e),
    }
  }
}
