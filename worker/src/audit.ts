/**
 * PHASE 5 — Audit trail
 * Every report stores a structured audit record in KV under audit:{request_id}
 */
import type { Env, PropertyReport } from './orchestrator'

export interface AuditRecord {
  audit_id: string
  address: string
  apn: string | null
  user_key: string
  tier: string
  timestamp: string
  sources_queried: Record<string, 'SUCCESS' | 'FAILURE' | 'UNAVAILABLE'>
  verified_fields: string[]
  inferred_fields: string[]
  unavailable_fields: string[]
  overall_confidence: number
  deal_score: string
  report_json_kv_key: string
  pdf_kv_key: string | null
  generation_time_seconds: number
}

export async function storeAuditRecord(
  env: Env,
  report: PropertyReport,
  userKey: string,
  pdfKvKey: string | null,
): Promise<void> {
  if (!env.SEVENNOVA_KEYS) return

  const verified: string[] = []
  const inferred: string[] = []
  const unavailable: string[] = []

  // Walk all typed result sections and classify fields by their status
  const sections: Record<string, unknown>[] = [
    (report.zoning ?? {}) as unknown as Record<string, unknown>,
    (report.valuation ?? {}) as unknown as Record<string, unknown>,
    (report.climate ?? {}) as unknown as Record<string, unknown>,
    (report.distress ?? {}) as unknown as Record<string, unknown>,
    (report.entitlement ?? {}) as unknown as Record<string, unknown>,
  ]

  for (const section of sections) {
    for (const [k, v] of Object.entries(section)) {
      if (!v || typeof v !== 'object' || !('value' in v)) continue
      const dp = v as { status?: string; value?: unknown }
      if (dp.value == null) {
        unavailable.push(k)
      } else if (dp.status === 'VERIFIED') {
        verified.push(k)
      } else if (dp.status === 'UNAVAILABLE') {
        unavailable.push(k)
      } else {
        inferred.push(k)
      }
    }
  }

  // Derive sources_queried from skill logs + data_freshness_summary
  const sources: Record<string, 'SUCCESS' | 'FAILURE' | 'UNAVAILABLE'> = {
    ZIMAS: report.data_freshness_summary === 'LA_CITY_LIVE' ? 'SUCCESS' : 'UNAVAILABLE',
    LADBS: 'UNAVAILABLE',
    FEMA: 'UNAVAILABLE',
    CALFIRE: 'UNAVAILABLE',
    CENSUS: 'UNAVAILABLE',
    HUD: 'UNAVAILABLE',
    ASSESSOR: 'UNAVAILABLE',
  }

  // Enrich from skill logs
  for (const skill of report.skills_activated) {
    if (!skill.activated) continue
    // skill data_freshness carries source info
    if (skill.data_freshness?.includes('LADBS')) sources.LADBS = 'SUCCESS'
    if (skill.data_freshness?.includes('FEMA')) sources.FEMA = 'SUCCESS'
  }

  const record: AuditRecord = {
    audit_id: report.request_id,
    address: report.address.full_address,
    apn: report.address.apn ?? null,
    user_key: userKey,
    tier: report.tier,
    timestamp: report.generated_at,
    sources_queried: sources,
    verified_fields: verified,
    inferred_fields: inferred,
    unavailable_fields: unavailable,
    overall_confidence: report.overall_confidence,
    deal_score: report.deal_score,
    report_json_kv_key: `report:${report.address.full_address.toLowerCase().replace(/\s+/g, '_')}:${report.tier}`,
    pdf_kv_key: pdfKvKey,
    generation_time_seconds: report.generation_time_seconds,
  }

  await env.SEVENNOVA_KEYS.put(
    `audit:${report.request_id}`,
    JSON.stringify(record),
    { expirationTtl: 86400 * 90 }, // 90 days
  ).catch(() => {})
}

export async function getAuditRecord(env: Env, auditId: string): Promise<AuditRecord | null> {
  if (!env.SEVENNOVA_KEYS) return null
  const raw = await env.SEVENNOVA_KEYS.get(`audit:${auditId}`)
  if (!raw) return null
  return JSON.parse(raw) as AuditRecord
}
