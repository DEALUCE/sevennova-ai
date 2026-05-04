"""
SevenNova RAG — Orchestrator Integration
Plugs RAG context retrieval into the existing LangGraph pipeline.

Adds a new node: rag_context_agent
Runs BEFORE narrative_agent to inject retrieved knowledge.

Updated pipeline:
  geocode → skill_executor → RAG_CONTEXT → narrative → quality_gate → assembler
"""
from __future__ import annotations

from typing import Any

import structlog

from core.rag_engine import SevenNovaRAG

log = structlog.get_logger()

# Singleton RAG instance — build index once, reuse across requests
_rag_instance: SevenNovaRAG | None = None


def get_rag() -> SevenNovaRAG:
    """Get or initialize the RAG singleton."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = SevenNovaRAG()
        _rag_instance.build_index()
        log.info("rag_singleton_initialized")
    return _rag_instance


async def rag_context_agent(state: dict) -> dict:
    """
    LangGraph node: retrieves RAG context for property analysis.
    Injects retrieved knowledge into state for narrative agent.

    Adds to state:
        rag_context: dict of {category: [retrieved_docs]}
        rag_citations: list of source citations for output

    Latency: P50=100ms, P95=400ms (local embeddings)
    Cost: $0 (fully local)
    """
    rag = get_rag()

    # Extract signals from previous agents
    parcel_data = state.get("parcel_data", {})
    skill_results = state.get("skill_results", {})
    has_violations = state.get("has_violations", False)

    # Get zoning code from skill results if available
    zoning_result = skill_results.get("la-developer-intelligence", {})
    zoning_code = (
        zoning_result.get("zoning_code", {}).get("value", "R3")
        if zoning_result else "R3"
    )

    location = parcel_data.get("city", "Los Angeles")
    is_development = True  # Always retrieve development context

    # Retrieve context
    context = rag.get_context_for_property(
        zoning_code=zoning_code,
        location=location,
        has_violations=has_violations,
        is_development=is_development,
    )

    # Format citations for output
    citations = []
    for category, docs in context.items():
        for doc in docs:
            meta = doc.get("metadata", {})
            citations.append({
                "category": category,
                "source": meta.get("source", "SevenNova Knowledge Base"),
                "freshness": meta.get("freshness", "CACHED"),
                "confidence": meta.get("confidence", 70),
                "similarity": doc.get("similarity_score", 0),
            })

    state["rag_context"] = context
    state["rag_citations"] = citations

    log.info(
        "rag_context_agent_complete",
        categories=list(context.keys()),
        total_docs=sum(len(v) for v in context.values()),
        citations=len(citations),
    )

    return state


def format_rag_context_for_llm(rag_context: dict[str, list[dict]]) -> str:
    """
    Format RAG context into a string for LLM consumption.
    Called by narrative_agent to inject retrieved knowledge.
    """
    if not rag_context:
        return ""

    sections = []
    for category, docs in rag_context.items():
        if not docs:
            continue
        section_title = category.replace("_", " ").upper()
        doc_texts = "\n---\n".join(d["text"] for d in docs[:3])
        sections.append(f"[RETRIEVED: {section_title}]\n{doc_texts}")

    return "\n\n".join(sections)
