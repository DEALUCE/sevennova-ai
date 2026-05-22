// ─────────────────────────────────────────────────────────────────────────────
// massing.ts — Phase 5A
//
// Pure deterministic math module producing a preliminary buildable envelope
// from verified/rule-based zoning inputs. No AI. No architectural design claim.
// No permit-readiness claim. Returns geometry suitable for a future Three.js
// box renderer (NOT built here).
//
// SAFETY: Always labels data_basis as RULE_BASED_ENVELOPE_ESTIMATE and sets
// human_review_required = true. If any required zoning input is missing,
// returns NEEDS_INPUT and does not compute the envelope.
// ─────────────────────────────────────────────────────────────────────────────

export interface LotDimensions {
  width_ft?: number
  depth_ft?: number
}

export interface Setbacks {
  front_ft?: number
  rear_ft?: number
  side_ft?: number   // applied to each side (left & right)
}

export interface MassingInput {
  lot_size_sf?: number | null
  lot_dimensions?: LotDimensions
  zoning_code?: string | null
  max_far?: number | null
  height_limit_ft?: number | null
  setbacks?: Setbacks
  floor_to_floor_height_ft?: number   // default 10 ft
  units_max?: number | null
}

export interface SimpleGeometry {
  lot: { width_ft: number; depth_ft: number }
  building: {
    width_ft: number
    depth_ft: number
    height_ft: number
    floors: number
  }
  origin: { x: number; y: number; z: number }   // building footprint origin relative to lot bottom-left
}

export type MassingStatus = 'OK' | 'NEEDS_INPUT'
export type HeightCompliance = 'WITHIN_LIMIT' | 'EXCEEDS_LIMIT' | 'NEEDS_INPUT'

export interface MassingResult {
  data_basis: 'RULE_BASED_ENVELOPE_ESTIMATE' | 'NEEDS_INPUT'
  human_review_required: true
  status: MassingStatus
  floors_estimated: number | null
  floor_plate_sf_estimated: number | null
  gross_building_area_sf_estimated: number | null
  far_utilization_pct: number | null
  height_compliance: HeightCompliance
  missing_inputs: string[]
  warnings: string[]
  simple_geometry: SimpleGeometry | null
  note?: string
  zoning_code?: string | null
  inputs_echo: {
    lot_size_sf: number | null
    max_far: number | null
    height_limit_ft: number | null
    floor_to_floor_height_ft: number
    setbacks_applied: Required<Setbacks>
  }
}

// ── Shared disclaimer text — never claim architecture or permit-readiness ───
const STANDARD_WARNINGS: readonly string[] = [
  'Preliminary envelope estimate — not architectural design and not permit-ready massing.',
  'Setbacks, overlays, design standards, parking layout, code-mandated variable setbacks, residential mix requirements, sprinkler/egress code, and structural feasibility require licensed architect and engineer review.',
]

// ── Pure deterministic envelope math ───────────────────────────────────────
export function computeMassing(input: MassingInput): MassingResult {
  const floorToFloor = input.floor_to_floor_height_ft ?? 10
  const sbFront = input.setbacks?.front_ft ?? 0
  const sbRear  = input.setbacks?.rear_ft  ?? 0
  const sbSide  = input.setbacks?.side_ft  ?? 0
  const setbacksApplied = { front_ft: sbFront, rear_ft: sbRear, side_ft: sbSide }

  const inputsEcho = {
    lot_size_sf: input.lot_size_sf ?? null,
    max_far: input.max_far ?? null,
    height_limit_ft: input.height_limit_ft ?? null,
    floor_to_floor_height_ft: floorToFloor,
    setbacks_applied: setbacksApplied,
  }

  // ── Required-input gate ──
  const missing: string[] = []
  if (!input.lot_size_sf || input.lot_size_sf < 1) missing.push('lot_size_sf')
  if (!input.max_far || input.max_far < 0.01) missing.push('max_far')
  if (!input.height_limit_ft || input.height_limit_ft < 1) missing.push('height_limit_ft')

  if (missing.length > 0) {
    return {
      data_basis: 'NEEDS_INPUT',
      human_review_required: true,
      status: 'NEEDS_INPUT',
      floors_estimated: null,
      floor_plate_sf_estimated: null,
      gross_building_area_sf_estimated: null,
      far_utilization_pct: null,
      height_compliance: 'NEEDS_INPUT',
      missing_inputs: missing,
      warnings: [...STANDARD_WARNINGS],
      simple_geometry: null,
      note: `Insufficient zoning inputs for envelope estimate. Missing: ${missing.join(', ')}.`,
      zoning_code: input.zoning_code ?? null,
      inputs_echo: inputsEcho,
    }
  }

  // From here on, lot_size_sf / max_far / height_limit_ft are present (validated above).
  const lotSf = input.lot_size_sf!
  const far = input.max_far!
  const heightLimit = input.height_limit_ft!

  const warnings: string[] = [...STANDARD_WARNINGS]

  // ── Lot dimensions (square-lot fallback if missing) ──
  let lotW = input.lot_dimensions?.width_ft
  let lotD = input.lot_dimensions?.depth_ft
  if (!lotW || !lotD) {
    const side = Math.sqrt(lotSf)
    if (!lotW) lotW = side
    if (!lotD) lotD = side
    warnings.push('Lot dimensions not fully provided; square-lot approximation used for envelope geometry.')
  }

  // ── Buildable footprint after setbacks ──
  const usableW = Math.max(0, lotW - sbSide * 2)
  const usableD = Math.max(0, lotD - sbFront - sbRear)
  const floorPlateRaw = usableW * usableD
  const floorPlate = Math.round(floorPlateRaw)

  if (floorPlate === 0) {
    warnings.push('Setbacks consume the full lot dimension on one or more axes; floor plate reduces to zero.')
  }

  // ── FAR-allowed gross building area ──
  const farGbaAllowed = Math.floor(lotSf * far)

  // ── Floor count: binding of (height-based, FAR-based) constraints ──
  const maxFloorsByHeight = Math.floor(heightLimit / floorToFloor)
  const floorsByFAR = floorPlate > 0 ? Math.ceil(farGbaAllowed / floorPlate) : 0
  const floors = floorPlate > 0 ? Math.min(maxFloorsByHeight, floorsByFAR) : 0

  // ── Actual GBA at chosen floor count, capped by FAR allowance ──
  let gba = floors * floorPlate
  if (gba > farGbaAllowed) gba = farGbaAllowed

  const farUtilizationPct = farGbaAllowed > 0
    ? Math.round((gba / farGbaAllowed) * 1000) / 10
    : 0

  // ── Height compliance (always within limit when computed from floor count, but
  //    record for downstream renderers / external callers feeding heights directly) ──
  const heightUsed = floors * floorToFloor
  const heightCompliance: HeightCompliance = heightUsed <= heightLimit ? 'WITHIN_LIMIT' : 'EXCEEDS_LIMIT'

  // ── Unit-density sanity check vs entitlement maximum ──
  if (input.units_max && input.units_max > 0 && floors > 0 && floorPlate > 0) {
    const unitsPerFloor = Math.floor(floorPlate / 850)   // 850 sf/unit baseline
    const envelopeUnitCapacity = unitsPerFloor * floors
    if (envelopeUnitCapacity < input.units_max) {
      warnings.push(
        `Envelope supports ~${envelopeUnitCapacity} units at 850 sf/unit baseline; entitlement permits up to ${input.units_max}. ` +
        `Smaller unit sizes, more floors (if zoning permits), or larger floor plate required to reach entitlement maximum.`,
      )
    }
  }

  // ── Three.js-friendly box geometry (lot + building envelope) ──
  const geometry: SimpleGeometry = {
    lot: { width_ft: lotW, depth_ft: lotD },
    building: {
      width_ft: usableW,
      depth_ft: usableD,
      height_ft: heightUsed,
      floors,
    },
    origin: { x: sbSide, y: sbFront, z: 0 },
  }

  return {
    data_basis: 'RULE_BASED_ENVELOPE_ESTIMATE',
    human_review_required: true,
    status: 'OK',
    floors_estimated: floors,
    floor_plate_sf_estimated: floorPlate,
    gross_building_area_sf_estimated: gba,
    far_utilization_pct: farUtilizationPct,
    height_compliance: heightCompliance,
    missing_inputs: [],
    warnings,
    simple_geometry: geometry,
    zoning_code: input.zoning_code ?? null,
    inputs_echo: inputsEcho,
  }
}
