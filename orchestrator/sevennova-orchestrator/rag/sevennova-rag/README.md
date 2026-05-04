# SevenNova RAG Knowledge Base — Component 3

Chroma vector store with semantic retrieval for property analysis.

## What This Does
- Indexes LA zoning codes, TOC tiers, entitlement pathways
- Indexes LADBS violation codes with severity + cure costs
- Indexes market data (rents, cap rates, vacancy by submarket)
- Indexes grants & incentives (LIHTC, ED1, AHSC, HOME/CDBG)
- Provides semantic search for the orchestrator before narrative generation

## Architecture
```
Knowledge JSON → Document Loader → Sentence Transformer Embeddings → Chroma
                                                                          ↓
Orchestrator → RAG Context Agent → Semantic Query → Retrieved Docs → LLM Prompt
```

## Quick Start
```bash
# 1. Install dependencies (add to existing requirements.txt)
pip install -r requirements_rag.txt

# 2. Build index (run once)
python build_index.py

# 3. Run tests
pytest tests/ -v --cov=core --cov=loaders --cov-report=term-missing
```

## Collections
| Collection | Contents | Docs |
|-----------|---------|------|
| sevennova_zoning | Zoning codes, TOC tiers, entitlement pathways | ~18 |
| sevennova_ladbs | LADBS violation codes | ~5 |
| sevennova_market | Rents, cap rates, vacancy | ~3 |
| sevennova_grants | Grants, incentives, programs | ~4 |

## Integration with Orchestrator
Add `rag_context_agent` node to orchestrator pipeline:

```python
# In orchestrator.py, add after skill_executor:
from core.orchestrator_integration import rag_context_agent

graph.add_node("rag_context", rag_context_agent)
graph.add_edge("skill_executor", "rag_context")
graph.add_edge("rag_context", "narrative")
```

## Cost
- $0/month — fully local (sentence-transformers + Chroma)
- Runs on RTX 4090 + 128GB RAM
- Index build: ~30 seconds first run
- Query latency: P50=50ms, P95=200ms

## Disclaimer
For informational purposes only. Not a licensed appraisal.
Verify all zoning rules with ZIMAS and LADBS directly.
© 2026 SevenNova.ai
