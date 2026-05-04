"""
SevenNova RAG — Test Suite
pytest tests for knowledge base, retrieval, and orchestrator integration.
Target: >80% coverage

Run: pytest tests/ -v --cov=core --cov=loaders --cov-report=term-missing
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from loaders.knowledge_loader import load_zoning_documents
from core.rag_engine import (
    SevenNovaRAG,
    COLLECTION_ZONING,
    COLLECTION_LADBS,
    COLLECTION_MARKET,
    COLLECTION_GRANTS,
)


# ── FIXTURES ───────────────────────────────────────────────────────────────

@pytest.fixture
def temp_rag(tmp_path):
    """RAG instance with temporary persist directory."""
    rag = SevenNovaRAG(persist_dir=str(tmp_path / "chroma"))
    return rag


@pytest.fixture
def indexed_rag(temp_rag):
    """RAG instance with index already built."""
    temp_rag.build_index(force_rebuild=True)
    return temp_rag


# ── UNIT: KNOWLEDGE LOADER ────────────────────────────────────────────────

class TestKnowledgeLoader:

    def test_loads_documents(self):
        docs = load_zoning_documents()
        assert len(docs) > 0, "Must load at least one document"

    def test_all_docs_have_text(self):
        docs = load_zoning_documents()
        for doc in docs:
            assert "text" in doc
            assert len(doc["text"]) > 10, "Text must be non-trivial"

    def test_all_docs_have_metadata(self):
        docs = load_zoning_documents()
        for doc in docs:
            assert "metadata" in doc
            assert "doc_type" in doc["metadata"]
            assert "source" in doc["metadata"]
            assert "freshness" in doc["metadata"]
            assert "confidence" in doc["metadata"]

    def test_zoning_codes_loaded(self):
        docs = load_zoning_documents()
        zoning_docs = [d for d in docs if d["metadata"]["doc_type"] == "zoning_code"]
        assert len(zoning_docs) >= 6, "Must load at least 6 zoning codes"

    def test_toc_tiers_loaded(self):
        docs = load_zoning_documents()
        toc_docs = [d for d in docs if d["metadata"]["doc_type"] == "toc_rule"]
        assert len(toc_docs) == 4, "Must load exactly 4 TOC tiers"

    def test_ladbs_violations_loaded(self):
        docs = load_zoning_documents()
        violation_docs = [d for d in docs if d["metadata"]["doc_type"] == "violation_code"]
        assert len(violation_docs) >= 4, "Must load at least 4 violation codes"

    def test_grants_loaded(self):
        docs = load_zoning_documents()
        grant_docs = [d for d in docs if d["metadata"]["doc_type"] == "grant"]
        assert len(grant_docs) >= 3, "Must load at least 3 grants"

    def test_cm_zoning_in_docs(self):
        """CM zoning is critical for Jefferson Blvd analysis."""
        docs = load_zoning_documents()
        cm_docs = [
            d for d in docs
            if d["metadata"].get("zoning_code") == "CM"
        ]
        assert len(cm_docs) > 0, "CM zoning must be in knowledge base"

    def test_substandard_violation_in_docs(self):
        """SEC 91.8602 is the Jefferson Blvd violation code."""
        docs = load_zoning_documents()
        texts = " ".join(d["text"] for d in docs)
        assert "91.8602" in texts or "Substandard" in texts

    def test_confidence_values_valid(self):
        docs = load_zoning_documents()
        for doc in docs:
            conf = doc["metadata"].get("confidence", 0)
            assert 0 <= conf <= 100, f"Confidence {conf} out of bounds"


# ── UNIT: RAG ENGINE ──────────────────────────────────────────────────────

class TestRAGEngine:

    def test_rag_initializes(self, temp_rag):
        assert temp_rag is not None
        assert temp_rag.client is not None
        assert temp_rag.embedder is not None

    def test_collections_created(self, temp_rag):
        stats = temp_rag.get_index_stats()
        assert COLLECTION_ZONING in stats["collections"]
        assert COLLECTION_LADBS in stats["collections"]
        assert COLLECTION_MARKET in stats["collections"]
        assert COLLECTION_GRANTS in stats["collections"]

    def test_build_index_populates_collections(self, indexed_rag):
        stats = indexed_rag.get_index_stats()
        assert stats["total_documents"] > 0
        assert stats["collections"][COLLECTION_ZONING] > 0
        assert stats["collections"][COLLECTION_LADBS] > 0

    def test_build_index_idempotent(self, indexed_rag):
        """Building twice should not duplicate documents."""
        stats_1 = indexed_rag.get_index_stats()
        indexed_rag.build_index(force_rebuild=False)
        stats_2 = indexed_rag.get_index_stats()
        assert stats_1["total_documents"] == stats_2["total_documents"]

    def test_force_rebuild_works(self, indexed_rag):
        """Force rebuild should result in same count."""
        stats_1 = indexed_rag.get_index_stats()
        indexed_rag.build_index(force_rebuild=True)
        stats_2 = indexed_rag.get_index_stats()
        assert stats_1["total_documents"] == stats_2["total_documents"]

    def test_query_returns_results(self, indexed_rag):
        results = indexed_rag.query("TOC Tier 3 density bonus multifamily")
        assert len(results) > 0

    def test_query_results_have_required_fields(self, indexed_rag):
        results = indexed_rag.query("zoning code R3 multifamily")
        for r in results:
            assert "text" in r
            assert "metadata" in r
            assert "similarity_score" in r
            assert "confidence" in r
            assert "collection" in r

    def test_query_similarity_sorted(self, indexed_rag):
        results = indexed_rag.query("TOC Tier density bonus affordable")
        scores = [r["similarity_score"] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_query_empty_string_returns_empty(self, indexed_rag):
        results = indexed_rag.query("")
        assert results == []

    def test_query_zoning_cm(self, indexed_rag):
        results = indexed_rag.query_zoning("CM")
        assert len(results) > 0
        texts = " ".join(r["text"] for r in results)
        assert "CM" in texts or "Commercial Manufacturing" in texts

    def test_query_violations_substandard(self, indexed_rag):
        results = indexed_rag.query_violations("substandard building LADBS order")
        assert len(results) > 0

    def test_query_entitlement_ed1(self, indexed_rag):
        results = indexed_rag.query_entitlement("100% affordable ministerial approval")
        assert len(results) > 0
        texts = " ".join(r["text"] for r in results)
        assert "ED1" in texts or "affordable" in texts.lower()

    def test_query_market_west_adams(self, indexed_rag):
        results = indexed_rag.query_market("West Adams Los Angeles")
        assert len(results) > 0

    def test_query_grants_toc(self, indexed_rag):
        results = indexed_rag.query_grants("TOC affordable housing multifamily")
        assert len(results) > 0

    def test_get_context_for_property(self, indexed_rag):
        context = indexed_rag.get_context_for_property(
            zoning_code="CM",
            location="Los Angeles",
            has_violations=True,
            is_development=True,
        )
        assert "zoning_rules" in context
        assert "market_data" in context
        assert "grants" in context
        assert "violation_codes" in context
        assert "entitlement_pathways" in context

    def test_get_context_no_violations(self, indexed_rag):
        context = indexed_rag.get_context_for_property(
            zoning_code="R3",
            location="Los Angeles",
            has_violations=False,
            is_development=False,
        )
        assert "violation_codes" not in context
        assert "entitlement_pathways" not in context

    def test_get_index_stats_structure(self, indexed_rag):
        stats = indexed_rag.get_index_stats()
        assert "collections" in stats
        assert "total_documents" in stats
        assert "embedding_model" in stats
        assert "persist_dir" in stats


# ── INTEGRATION: JEFFERSON BLVD ───────────────────────────────────────────

class TestJeffersonBoulevardScenario:
    """
    Integration tests using the actual Jefferson Blvd property.
    This is the proof-of-product case.
    """

    def test_cm_zoning_retrieval(self, indexed_rag):
        """CM zoning rules must be retrievable — core to Jefferson analysis."""
        results = indexed_rag.query_zoning("CM")
        assert len(results) > 0
        top_text = results[0]["text"]
        assert len(top_text) > 20

    def test_substandard_order_violation(self, indexed_rag):
        """LADBS substandard order must match violation database."""
        results = indexed_rag.query_violations(
            "substandard building LAMC 91.8602 fines cure"
        )
        assert len(results) > 0
        texts = " ".join(r["text"] for r in results)
        assert "Substandard" in texts or "cure" in texts.lower()

    def test_ed1_pathway_retrieval(self, indexed_rag):
        """ED1 fast-track must be in entitlement pathways."""
        results = indexed_rag.query_entitlement("affordable ministerial fast track")
        texts = " ".join(r["text"] for r in results)
        assert "ED1" in texts or "ministerial" in texts.lower()

    def test_west_adams_rent_data(self, indexed_rag):
        """West Adams rent data must be retrievable."""
        results = indexed_rag.query_market("West Adams")
        assert len(results) > 0

    def test_lihtc_grant_retrieval(self, indexed_rag):
        """LIHTC grant must be findable for development path."""
        results = indexed_rag.query_grants("LIHTC affordable housing tax credit")
        texts = " ".join(r["text"] for r in results)
        assert "LIHTC" in texts or "Tax Credit" in texts

    def test_full_property_context(self, indexed_rag):
        """Full property context retrieval for Jefferson Blvd."""
        context = indexed_rag.get_context_for_property(
            zoning_code="CM",
            location="West Adams Los Angeles",
            has_violations=True,
            is_development=True,
        )
        total_docs = sum(len(v) for v in context.values())
        assert total_docs >= 5, f"Must retrieve at least 5 docs, got {total_docs}"


# ── ORCHESTRATOR INTEGRATION ──────────────────────────────────────────────

class TestOrchestratorIntegration:

    @pytest.mark.asyncio
    async def test_rag_context_agent(self, indexed_rag):
        """Test the LangGraph node integration."""
        from core.orchestrator_integration import rag_context_agent, get_rag
        import core.orchestrator_integration as oi
        oi._rag_instance = indexed_rag  # Inject test instance

        state = {
            "parcel_data": {"city": "Los Angeles"},
            "skill_results": {
                "la-developer-intelligence": {
                    "zoning_code": {"value": "CM", "confidence": 75.0}
                }
            },
            "has_violations": True,
        }

        result = await rag_context_agent(state)
        assert "rag_context" in result
        assert "rag_citations" in result
        assert len(result["rag_citations"]) > 0

    def test_format_rag_context_for_llm(self, indexed_rag):
        """Context must format correctly for LLM prompt injection."""
        from core.orchestrator_integration import format_rag_context_for_llm

        context = indexed_rag.get_context_for_property(
            zoning_code="CM",
            location="Los Angeles",
            has_violations=True,
        )
        formatted = format_rag_context_for_llm(context)
        assert isinstance(formatted, str)
        assert len(formatted) > 0
        assert "RETRIEVED" in formatted

    def test_format_empty_context(self):
        from core.orchestrator_integration import format_rag_context_for_llm
        result = format_rag_context_for_llm({})
        assert result == ""
