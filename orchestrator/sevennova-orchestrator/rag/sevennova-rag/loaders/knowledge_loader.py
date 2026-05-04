"""
SevenNova RAG — Document Loaders
Ingests all knowledge sources into Chroma vector store.

Sources:
  1. LA zoning rules (JSON)
  2. LADBS violation codes (JSON)
  3. TOC/ED1 eligibility rules (JSON)
  4. Market data (JSON)
  5. Grants & incentives (JSON)
  6. Comparable sales (future: ATTOM API)
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import structlog

log = structlog.get_logger()

RAW_DATA_DIR = Path(__file__).parent.parent / "data" / "raw"


def load_zoning_documents() -> list[dict[str, Any]]:
    """
    Load LA zoning knowledge base and convert to
    flat documents for embedding.

    Returns:
        List of {text, metadata} dicts ready for Chroma ingestion.
    """
    kb_path = RAW_DATA_DIR / "la_zoning_knowledge_base.json"
    with open(kb_path) as f:
        kb = json.load(f)

    documents = []

    # ── ZONING CODES ──────────────────────────────────────────────────────
    for zone in kb.get("zoning_codes", []):
        text = f"""
Zoning Code: {zone['code']} — {zone['name']}
Permitted Uses: {', '.join(zone['permitted_uses'])}
Max FAR: {zone['max_far']}
Height Limit: {zone['height_limit_ft']} feet
Max Density: {zone['max_density']}
TOC Eligible: {zone['toc_eligible']}
ED1 Eligible: {zone['ed1_eligible']}
AB2011 Eligible: {zone['ab2011_eligible']}
RSO Applies: {zone['rso_applies']}
Notes: {zone['notes']}
        """.strip()

        documents.append({
            "text": text,
            "metadata": {
                "source": "la_zoning_codes",
                "doc_type": "zoning_code",
                "zoning_code": zone["code"],
                "freshness": kb["freshness"],
                "confidence": kb["confidence"],
            }
        })

    # ── TOC TIERS ─────────────────────────────────────────────────────────
    for tier in kb.get("toc_tiers", []):
        text = f"""
TOC Tier {tier['tier']}:
Transit Distance: within {tier['transit_distance_ft']} feet of {tier['transit_type']}
Density Bonus: {tier['density_bonus_pct']}% above base
Max Incentives: {tier['max_incentives']}
Parking Reduction: {tier['parking_reduction_pct']}%
Affordability Requirement: {tier['affordable_requirement']}
        """.strip()

        documents.append({
            "text": text,
            "metadata": {
                "source": "toc_tiers",
                "doc_type": "toc_rule",
                "tier": tier["tier"],
                "freshness": kb["freshness"],
                "confidence": kb["confidence"],
            }
        })

    # ── ENTITLEMENT PATHWAYS ──────────────────────────────────────────────
    for pathway in kb.get("entitlement_pathways", []):
        text = f"""
Entitlement Pathway: {pathway['pathway']}
Description: {pathway['description']}
Timeline: {pathway['timeline_months']} months
Approval Probability: {int(pathway['approval_probability'] * 100)}%
CEQA Required: {pathway['ceqa_required']}
Public Hearing: {pathway['public_hearing']}
IRR Impact: {pathway['irr_impact_pct']}%
Notes: {pathway['notes']}
        """.strip()

        documents.append({
            "text": text,
            "metadata": {
                "source": "entitlement_pathways",
                "doc_type": "entitlement",
                "pathway": pathway["pathway"],
                "freshness": kb["freshness"],
                "confidence": kb["confidence"],
            }
        })

    # ── LADBS VIOLATION CODES ─────────────────────────────────────────────
    for violation in kb.get("ladbs_violation_codes", []):
        cure_min, cure_max = violation["typical_cure_cost_range"]
        text = f"""
LADBS Violation Code: {violation['code']}
Name: {violation['name']}
Description: {violation['description']}
Severity: {violation['severity']}
Distress Signal: {violation['distress_signal']}
Cure Cost Range: ${cure_min:,} to ${cure_max:,}
Cure Timeline: {violation['cure_timeline_months']} months
Daily Fine: ${violation['daily_fine_usd']}/day
Notes: {violation['notes']}
        """.strip()

        documents.append({
            "text": text,
            "metadata": {
                "source": "ladbs_violations",
                "doc_type": "violation_code",
                "violation_code": violation["code"],
                "severity": violation["severity"],
                "distress_signal": violation["distress_signal"],
                "freshness": kb["freshness"],
                "confidence": kb["confidence"],
            }
        })

    # ── MARKET DATA ───────────────────────────────────────────────────────
    market = kb.get("market_data", {})
    cap_rates = market.get("la_metro_cap_rates_2025", {})
    rents = market.get("submarket_rent_2025", {})
    vacancy = market.get("vacancy_rates_2025", {})

    cap_text = "LA Metro Cap Rates 2025:\n" + "\n".join(
        f"  {k.replace('_', ' ').title()}: {v*100:.1f}%"
        for k, v in cap_rates.items()
        if k not in ("source", "freshness")
    )
    documents.append({
        "text": cap_text,
        "metadata": {
            "source": cap_rates.get("source", "market_data"),
            "doc_type": "cap_rates",
            "freshness": cap_rates.get("freshness", "CACHED"),
            "confidence": 80,
        }
    })

    rent_text = "LA Submarket Average Rents 2025:\n" + "\n".join(
        f"  {k.replace('_', ' ').title()}: ${v:,}/month"
        for k, v in rents.items()
        if k not in ("source", "freshness")
    )
    documents.append({
        "text": rent_text,
        "metadata": {
            "source": rents.get("source", "market_data"),
            "doc_type": "rent_data",
            "freshness": rents.get("freshness", "CACHED"),
            "confidence": 75,
        }
    })

    vacancy_text = "LA Submarket Vacancy Rates 2025:\n" + "\n".join(
        f"  {k.replace('_', ' ').title()}: {v*100:.1f}%"
        for k, v in vacancy.items()
        if k not in ("source", "freshness")
    )
    documents.append({
        "text": vacancy_text,
        "metadata": {
            "source": vacancy.get("source", "market_data"),
            "doc_type": "vacancy_data",
            "freshness": vacancy.get("freshness", "CACHED"),
            "confidence": 75,
        }
    })

    # ── GRANTS ────────────────────────────────────────────────────────────
    for grant in kb.get("grants_incentives", []):
        text = f"""
Grant/Incentive Program: {grant['program']}
Administrator: {grant['administrator']}
Type: {grant['type']}
Value per Unit: {f"${grant['value_per_unit']:,} (est.)" if grant['value_per_unit'] else "varies"}
Affordability Requirement: {grant['affordability_requirement']}
Minimum Units: {grant['min_units'] or 'None specified'}
Difficulty: {grant['difficulty']}
Pairs With: {', '.join(grant['pairs_with'])}
Notes: {grant['notes']}
        """.strip()

        documents.append({
            "text": text,
            "metadata": {
                "source": "grants_incentives",
                "doc_type": "grant",
                "program": grant["program"],
                "difficulty": grant["difficulty"],
                "freshness": kb["freshness"],
                "confidence": kb["confidence"],
            }
        })

    log.info("documents_loaded", count=len(documents))
    return documents
