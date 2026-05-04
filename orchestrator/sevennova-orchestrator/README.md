# SevenNova.ai Orchestrator
**15 AI engines. One report. Address in → intelligence out.**

## Architecture

```
Address Input (HTTP POST)
        ↓
  [Geocode Agent]          validates address, detects property type
        ↓
  [Skill Router]           routes to correct subset of 15 skills
        ↓
  [Skill Executor]         runs all skills CONCURRENTLY via asyncio
        ↓
  [Narrative Agent]        Claude generates investment analysis
        ↓
  [Quality Gate]           self-correction: validates all outputs
        ↓
  [Report Assembler]       builds final PropertyReport
        ↓
  JSON Response / HTML Report
```

## Stack
- **LLM:** Claude claude-sonnet-4-20250514 (Anthropic API)
- **Orchestration:** LangGraph (multi-agent state machine)
- **API:** FastAPI + uvicorn
- **Vector Store:** Chroma (RAG — coming in Component 3)
- **ML Models:** XGBoost + LightGBM + CatBoost (Component 2)
- **Deploy:** Docker + Cloudflare Workers / Railway

## Quick Start

```bash
# 1. Clone
git clone https://github.com/DEALUCE/sevennova-ai
cd sevennova-ai/orchestrator

# 2. Environment
cp .env.example .env
# Edit .env — add ANTHROPIC_API_KEY (required)

# 3. Install
pip install -r requirements.txt

# 4. Run
uvicorn api.main:app --reload --port 8000

# 5. Test
curl -X POST http://localhost:8000/api/v1/report \
  -H "Content-Type: application/json" \
  -d '{
    "street": "3612 W Jefferson Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zip_code": "90016",
    "tier": "full"
  }'
```

## Run Tests
```bash
pytest tests/ -v --cov=core --cov=api --cov-report=term-missing
# Target: >80% coverage
```

## Deploy with Docker
```bash
docker-compose up --build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/report` | Generate new report |
| GET | `/api/v1/report/{id}` | Get report by ID |
| POST | `/api/v1/webhook/stripe` | Stripe payment webhook |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |
| GET | `/docs` | Swagger UI |

## Report Tiers

| Tier | Price | Skills | Target Latency |
|------|-------|--------|----------------|
| basic | $49 | 3 skills | 15s |
| full | $199 | 10 skills | 30s |
| institutional | $499 | 15 skills | 60s |

## Cost per Report (Bootstrap Mode)
- Basic: ~$0.04 cost → 99.9% margin at $49
- Full: ~$0.10 cost → 99.9% margin at $199
- Institutional: ~$0.22 cost → 99.9% margin at $499

## Active Skills (15)
1. `la-developer-intelligence` — zoning, TOC/ED1, max units
2. `entitlement-velocity-engine` — permit timeline prediction
3. `distressed-debt-radar` — pre-foreclosure signals
4. `llc-veil-piercing` — ownership graphs
5. `data-center-intelligence` — DC corridor appreciation
6. `geospatial-analysis` — proximity scoring
7. `la-rental-site-builder` — property marketing sites
8. `tenant-credit-collapse` — tenant financial health
9. `climate-adjusted-avm` — climate-risk valuations
10. `ensemble-pricing-engine` — XGBoost ML pricing
11. `institutional-capital-tracker` — smart money signals
12. `pricing-oracle` — underpriced property detection
13. `satellite-change-detector` — pre-permit construction
14. `power-grid-intel` — LADWP/SCE capacity
15. `tenant-demand-signal` — employment demand forecast

## Next Components
- **Component 2:** ML pricing model (XGBoost trained on LA County sales)
- **Component 3:** RAG knowledge base (Chroma + zoning rules + LADBS)
- **Component 4:** Auto HTML report generator
- **Component 5:** Stripe webhook → auto-trigger report

## Compliance
All outputs include mandatory disclaimer:
> *For informational purposes only. Not a licensed appraisal. Not legal advice.
> Consult a licensed professional before making any real estate or financial decision.
> © 2026 SevenNova.ai*

Data freshness tags on all outputs: `[LIVE | CACHED | STALE | UNVERIFIED]`
Confidence scores (0-100%) on all key claims.
