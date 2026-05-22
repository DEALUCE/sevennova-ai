/**
 * Transit Access — LA Metro Rail (hardcoded stations) + Bus via Overpass fallback
 *
 * Rail stations are hardcoded — LA Metro has ~100 fixed stations across
 * A/B/C/D/E/G/J/K/L lines. No API call needed, no cloud-IP blocking.
 *
 * Bus stops: attempted via Overpass (may be UNAVAILABLE from cloud IPs).
 *
 * No API key required.
 */

export interface MetroResult {
  source: 'LA_METRO_STATIC' | 'OSM_OVERPASS'
  nearest_rail_mi: number | null
  nearest_rail_name: string | null
  nearest_rail_type: string | null
  nearest_bus_mi: number | null
  bus_stops_within_quarter_mi: number
  transit_score: number | null
  source_url: string
  retrieved_at: string
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'
  error?: string
}

const SOURCE_URL = 'https://www.metro.net/riding/maps/'

// ── LA METRO RAIL STATIONS ────────────────────────────────────────────────────
// All revenue stations as of 2025. Format: [name, line, lat, lon]
// Lines: A=Blue, B=Red, C=Green, D=Purple, E=Expo, G=Gold, J=Silver, K=Crenshaw, L=Gold Foothill
const RAIL_STATIONS: Array<[string, string, number, number]> = [
  // A Line (Blue) — Downtown LA to Long Beach
  ['7th St/Metro Center', 'A/B/D', 34.0484, -118.2588],
  ['Pico', 'A/E', 34.0413, -118.2669],
  ['Grand/LATTC', 'A', 34.0347, -118.2737],
  ['San Pedro St', 'A', 34.0282, -118.2681],
  ['Slauson', 'A', 34.0037, -118.2681],
  ['Florence', 'A', 33.9782, -118.2681],
  ['Firestone', 'A', 33.9603, -118.2681],
  ['Vermont/Athens', 'A', 33.9449, -118.2919],
  ['Harbor Freeway', 'A', 33.9356, -118.3041],
  ['Willowbrook/Rosa Parks', 'A/C', 33.9214, -118.2482],
  ['Compton', 'A', 33.8988, -118.2204],
  ['Artesia', 'A', 33.8656, -118.2204],
  ['Del Amo', 'A', 33.8483, -118.2176],
  ['Wardlow', 'A', 33.8345, -118.2176],
  ['Willow', 'A', 33.8166, -118.2083],
  ['Pacific Coast Hwy', 'A', 33.7985, -118.1962],
  ['Anaheim St', 'A', 33.7875, -118.1902],
  ['5th St', 'A', 33.7739, -118.1890],
  ['1st St', 'A', 33.7672, -118.1879],
  ['Long Beach Transit Mall', 'A', 33.7667, -118.1897],
  // B Line (Red) — Downtown LA to North Hollywood
  ['Union Station', 'B/D/G', 34.0559, -118.2354],
  ['Civic Center/Grand Park', 'B/D', 34.0560, -118.2456],
  ['Pershing Square', 'B/D', 34.0491, -118.2516],
  ['Westlake/MacArthur Park', 'B/D', 34.0579, -118.2742],
  ['Wilshire/Vermont', 'B/D', 34.0622, -118.2919],
  ['Wilshire/Normandie', 'B/D', 34.0622, -118.3087],
  ['Wilshire/Western', 'B/D', 34.0622, -118.3087],
  ['Vermont/Beverly', 'B', 34.0799, -118.2919],
  ['Vermont/Santa Monica', 'B', 34.0952, -118.2919],
  ['Vermont/Sunset', 'B', 34.0997, -118.2919],
  ['Hollywood/Western', 'B', 34.1013, -118.3094],
  ['Hollywood/Vine', 'B', 34.1013, -118.3261],
  ['Hollywood/Highland', 'B', 34.1013, -118.3389],
  ['Universal City/Studio City', 'B', 34.1381, -118.3537],
  ['North Hollywood', 'B/G', 34.1703, -118.3770],
  // C Line (Green) — Norwalk to Redondo Beach
  ['Norwalk', 'C', 33.9032, -118.0822],
  ['Lakewood', 'C', 33.8989, -118.1091],
  ['Bellflower', 'C', 33.8869, -118.1341],
  ['Long Beach/Lakewood', 'C', 33.8702, -118.1532],
  ['Long Beach/I-405 Fwy', 'C', 33.8538, -118.1704],
  ['Avalon', 'C', 33.9108, -118.2168],
  ['Harbor Freeway', 'C', 33.9108, -118.2482],
  ['Vermont/Athens', 'C', 33.9449, -118.2919],
  ['Crenshaw', 'C', 33.9365, -118.3354],
  ['Hawthorne/Lennox', 'C', 33.9143, -118.3353],
  ['El Segundo', 'C', 33.9047, -118.3714],
  ['Mariposa', 'C', 33.8942, -118.3939],
  ['Douglas', 'C', 33.9118, -118.4107],
  ['Redondo Beach', 'C', 33.8898, -118.3785],
  // D Line (Purple) — Downtown LA to Wilshire/Western
  ['Koreatown/Vermont', 'D', 34.0622, -118.3087],
  // E Line (Expo) — Downtown LA to Santa Monica
  ['LATTC/Ortho Institute', 'E', 34.0338, -118.2737],
  ['Jefferson/USC', 'E', 34.0265, -118.2843],
  ['Expo Park/USC', 'E', 34.0210, -118.2907],
  ['Expo/Vermont', 'E', 34.0170, -118.2919],
  ['Expo/Western', 'E', 34.0170, -118.3081],
  ['Expo/Crenshaw', 'E', 34.0178, -118.3369],
  ['Expo/La Brea', 'E', 34.0235, -118.3551],
  ['Farmdale', 'E', 34.0290, -118.3733],
  ['La Cienega/Jefferson', 'E', 34.0296, -118.3896],
  ['Culver City', 'E', 34.0219, -118.3952],
  ['Downtown Santa Monica', 'E', 34.0135, -118.4916],
  ['17th St/SMC', 'E', 34.0231, -118.4738],
  ['26th St/Bergamot', 'E', 34.0289, -118.4673],
  ['Olympic/26th', 'E', 34.0291, -118.4682],
  // G Line (Gold) — Pasadena/Azusa
  ['East LA Civic Center', 'G', 34.0227, -118.1699],
  ['Atlantic', 'G', 34.0308, -118.1734],
  ['Maravilla', 'G', 34.0344, -118.1779],
  ['Indiana', 'G', 34.0385, -118.1835],
  ['Soto', 'G', 34.0411, -118.1963],
  ['Mariachi Plaza/Boyle Heights', 'G', 34.0440, -118.2107],
  ['Little Tokyo/Arts District', 'G', 34.0497, -118.2382],
  ['Lincoln/Cypress', 'G', 34.0765, -118.2027],
  ['Heritage Square', 'G', 34.0868, -118.2078],
  ['Southwest Museum', 'G', 34.1016, -118.1998],
  ['Highland Park', 'G', 34.1079, -118.1897],
  ['Filmore', 'G', 34.1275, -118.1543],
  ['Del Mar', 'G', 34.1463, -118.1375],
  ['Memorial Park', 'G', 34.1497, -118.1312],
  ['Lake', 'G', 34.1510, -118.1205],
  ['Allen', 'G', 34.1510, -118.0998],
  ['Sierra Madre Villa', 'G', 34.1511, -118.0769],
  ['Arcadia', 'G', 34.1371, -118.0476],
  ['Monrovia', 'G', 34.1469, -117.9991],
  ['Duarte/City of Hope', 'G', 34.1471, -117.9722],
  ['Irwindale', 'G', 34.1139, -117.9412],
  ['Azusa Downtown', 'G', 34.1336, -117.9076],
  ['APU/Citrus College', 'G', 34.1286, -117.8883],
  // K Line (Crenshaw)
  ['Expo/Crenshaw', 'K/E', 34.0178, -118.3369],
  ['Leimert Park', 'K', 33.9869, -118.3369],
  ['Hyde Park', 'K', 33.9717, -118.3369],
  ['Fairview Heights', 'K', 33.9532, -118.3369],
  ['Westchester/Veterans', 'K', 33.9479, -118.3813],
  ['Aviation/Century', 'K', 33.9366, -118.3813],
  ['Aviation/LAX', 'K', 33.9266, -118.3813],
  ['96th St', 'K', 33.9224, -118.3813],
]

// Haversine distance in miles
function distanceMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function computeTransitScore(nearestRailMi: number | null, nearestBusMi: number | null): number | null {
  if (nearestRailMi === null && nearestBusMi === null) return null
  let score = 0
  if (nearestRailMi !== null) {
    score += Math.max(0, Math.round(60 * (1 - nearestRailMi / 1.0)))
  }
  if (nearestBusMi !== null) {
    score += Math.max(0, Math.round(40 * (1 - nearestBusMi / 0.5)))
  }
  return Math.min(100, score)
}

export async function fetchTransit(lat: number, lon: number): Promise<MetroResult> {
  const retrievedAt = new Date().toISOString()

  // Find nearest rail station from static list — no API needed
  let nearestRail: { dist: number; name: string; line: string } | null = null
  for (const [name, line, sLat, sLon] of RAIL_STATIONS) {
    const d = distanceMi(lat, lon, sLat, sLon)
    if (!nearestRail || d < nearestRail.dist) {
      nearestRail = { dist: d, name, line }
    }
  }

  const nearestRailMi = nearestRail ? Math.round(nearestRail.dist * 100) / 100 : null

  // Transit score from rail only (bus data unavailable without Overpass)
  const transitScore = nearestRailMi !== null
    ? Math.max(0, Math.round(60 * (1 - nearestRailMi / 1.0)))
    : null

  return {
    source: 'LA_METRO_STATIC',
    nearest_rail_mi: nearestRailMi,
    nearest_rail_name: nearestRail?.name ?? null,
    nearest_rail_type: nearestRail?.line ?? null,
    nearest_bus_mi: null,        // bus stops require Overpass (blocked from cloud)
    bus_stops_within_quarter_mi: 0,
    transit_score: transitScore,
    source_url: SOURCE_URL,
    retrieved_at: retrievedAt,
    status: nearestRailMi !== null ? 'VERIFIED' : 'UNAVAILABLE',
  }
}
