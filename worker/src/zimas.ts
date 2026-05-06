/**
 * ZIMAS integration — LA City zoning data, no API key required
 *
 * Flow:
 *   1. Geocode address → lat/lon via Nominatim (OpenStreetMap, free)
 *   2. Query LA City MapServer for zoning attributes
 *   3. Derive FAR + height from zone code via LAMC lookup table
 */

export interface ZimasResult {
  source: 'zimas'
  lat: number
  lon: number
  zone_code: string        // e.g. "C2-1"
  zone_class: string       // e.g. "C2"
  height_district: string  // e.g. "1", "2", "3", "1VL", "1L"
  zone_description: string
  max_far: number | null
  height_limit_ft: number | null
  height_limit_stories: number | null
  raw: Record<string, unknown>
  error?: string
}

// ── LAMC HEIGHT DISTRICT LOOKUP ──────────────────────────────────────────────
// Ref: LA Municipal Code Title 22 / LAMC 12.21.1
const HEIGHT_DISTRICT: Record<string, { ft: number | null; stories: number | null }> = {
  '1VL':  { ft: 25,   stories: 2 },
  '1XL':  { ft: 25,   stories: 2 },
  '1L':   { ft: 33,   stories: 3 },
  '1':    { ft: 45,   stories: 3 },  // standard residential; C/M zones unlimited
  '2':    { ft: 45,   stories: 4 },
  '3':    { ft: 75,   stories: 6 },
  '4':    { ft: null, stories: null }, // unlimited
}

// FAR by zone class + height district
// Ref: LAMC Table 12.21-A-10
const FAR_TABLE: Record<string, Record<string, number>> = {
  R1:  { '1VL': 0.50, '1XL': 0.50, '1L': 0.50, '1': 0.50, '2': 0.60, '3': 0.75, '4': 1.00 },
  R2:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 0.65, '2': 0.85, '3': 1.50, '4': 2.00 },
  RD:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 0.65, '2': 0.85, '3': 1.50, '4': 2.00 },
  R3:  { '1VL': 0.75, '1XL': 0.75, '1L': 0.85, '1': 1.00, '2': 1.50, '3': 3.00, '4': 4.50 },
  R4:  { '1VL': 1.00, '1XL': 1.00, '1L': 1.25, '1': 1.50, '2': 2.25, '3': 4.50, '4': 6.00 },
  R5:  { '1VL': 1.50, '1XL': 1.50, '1L': 2.00, '1': 3.00, '2': 4.50, '3': 6.00, '4': 6.00 },
  C1:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  C1P: { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  C2:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  C4:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  C5:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  CM:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  CR:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  M1:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  M2:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  M3:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  PF:  { '1VL': 0.55, '1XL': 0.55, '1L': 0.60, '1': 1.50, '2': 1.50, '3': 3.00, '4': 6.00 },
  OS:  { '1VL': 0.00, '1XL': 0.00, '1L': 0.00, '1': 0.00, '2': 0.00, '3': 0.00, '4': 0.00 },
}

function parseHeightDistrict(zoneCode: string): string {
  // Zone code format: CLASS-HEIGHTDISTRICT[SUFFIX]
  // e.g. "C2-1", "R3-1VL", "M1-2", "R2-1L"
  const match = zoneCode.match(/-(\d+[A-Z]*)/)
  if (!match) return '1'
  return match[1]
}

function parseZoneClass(zoneCode: string): string {
  // Strip height district — everything before the dash
  const base = zoneCode.split('-')[0]
  // Strip overlay suffixes like [Q], [D], [T] in brackets
  return base.replace(/\[.*\]/g, '').trim().toUpperCase()
}

function lookupFAR(zoneClass: string, heightDistrict: string): number | null {
  const classTable = FAR_TABLE[zoneClass]
  if (!classTable) return null
  return classTable[heightDistrict] ?? classTable['1'] ?? null
}

// ── GEOCODE ──────────────────────────────────────────────────────────────────

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  const encoded = encodeURIComponent(address)
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=us`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SevenNova.ai/1.0 (info@sevennova.ai)' },
  })
  if (!res.ok) return null
  const data = await res.json() as Array<{ lat: string; lon: string }>
  if (!data.length) return null
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
}

// ── ZIMAS QUERY ──────────────────────────────────────────────────────────────

const ZIMAS_URL = 'https://maps.lacity.org/lahub/rest/services/City_Planning_Department/MapServer/8/query'

async function queryZimas(lat: number, lon: number): Promise<Record<string, unknown> | null> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    // 50ft buffer handles street-centerline geocodes that miss parcel polygons
    distance: '50',
    units: 'esriSRUnit_Foot',
    outFields: 'ZONE_CMPLT,ZONE_CLASS,ZONE_CODE,ZONING_DESCRIPTION,TOOLTIP',
    returnGeometry: 'false',
    f: 'json',
  })
  const res = await fetch(`${ZIMAS_URL}?${params}`)
  if (!res.ok) return null
  const data = await res.json() as { features?: Array<{ attributes: Record<string, unknown> }> }
  if (!data.features?.length) return null
  return data.features[0].attributes
}

// ── PUBLIC ENTRY POINT ───────────────────────────────────────────────────────

export async function fetchZoning(
  street: string,
  city: string,
  state: string,
  zipCode?: string,
): Promise<ZimasResult> {
  const fullAddress = [street, city, state, zipCode].filter(Boolean).join(', ')

  // Step 1: geocode
  const coords = await geocode(fullAddress)
  if (!coords) {
    return {
      source: 'zimas',
      lat: 0, lon: 0,
      zone_code: 'UNKNOWN',
      zone_class: 'UNKNOWN',
      height_district: '1',
      zone_description: 'Geocoding failed',
      max_far: null,
      height_limit_ft: null,
      height_limit_stories: null,
      raw: {},
      error: `Could not geocode: ${fullAddress}`,
    }
  }

  // Step 2: query ZIMAS
  const attrs = await queryZimas(coords.lat, coords.lon)
  if (!attrs) {
    return {
      source: 'zimas',
      lat: coords.lat, lon: coords.lon,
      zone_code: 'UNKNOWN',
      zone_class: 'UNKNOWN',
      height_district: '1',
      zone_description: 'No ZIMAS data found',
      max_far: null,
      height_limit_ft: null,
      height_limit_stories: null,
      raw: {},
      error: 'ZIMAS returned no features for these coordinates',
    }
  }

  // Step 3: parse and derive
  const zoneCode = String(attrs.ZONE_CMPLT ?? attrs.TOOLTIP ?? 'UNKNOWN')
    .replace(/^Zone:\s*/i, '').trim()
  const zoneClass = parseZoneClass(zoneCode)
  const heightDistrict = parseHeightDistrict(zoneCode)
  const heightInfo = HEIGHT_DISTRICT[heightDistrict] ?? HEIGHT_DISTRICT['1']
  const maxFAR = lookupFAR(zoneClass, heightDistrict)

  return {
    source: 'zimas',
    lat: coords.lat,
    lon: coords.lon,
    zone_code: zoneCode,
    zone_class: zoneClass,
    height_district: heightDistrict,
    zone_description: String(attrs.ZONING_DESCRIPTION ?? ''),
    max_far: maxFAR,
    height_limit_ft: heightInfo.ft,
    height_limit_stories: heightInfo.stories,
    raw: attrs,
  }
}
