# SevenNova Agent Brain v2 — Component 6

Hierarchical multi-agent system. 1 Supervisor + 8 Sub-Brains.
Self-healing, 24/7 autonomous operation.

## V2 Fixes (vs V1)
| Gap | Fixed |
|-----|-------|
| No inter-brain communication | ACP Message Bus (pub/sub + dedup) |
| No dead-man switch | External Watchdog — heartbeat every 5min |
| No rollback | Git SHA snapshot + post-deploy health check |
| No API rate governor | Redis Token Governor — per-brain budget |
| Duplicate incident alerts | Fingerprint dedup — 5min TTL window |
| Customer Brain stateless | Postgres CRM state store |
| SEO auto-publishes | Tier 2 GitHub PR gate |
| Quality QA post-delivery | Pre-delivery gate — holds in PENDING |
| Cron collisions | Staggered schedules — no overlap |
| No per-brain kill switch | Redis boolean — external, hot-toggle |
| No idempotency | UUID key on every tool call |
| No circuit breakers | Per-tool — open at 50%, cooldown 10min |

## Structure
```
sevennova-agent-brain/
├── infra/
│   ├── models.py        # All Pydantic models + enums
│   └── safety.py        # CircuitBreaker, KillSwitch, TokenGovernor, Idempotency
├── bus/
│   └── message_bus.py   # ACP inter-brain pub/sub
├── brains/
│   ├── base_brain.py    # Base class — V2 decision loop
│   └── sub_brains.py    # All 8 sub-brains
├── supervisor/
│   └── supervisor.py    # Supervisor + ExternalWatchdog
├── api/
│   └── main.py          # FastAPI HTTP interface
└── tests/
    └── test_agent_brain.py  # All gap fixes tested
```

## Quick Start
```bash
pip install -r requirements_brain.txt
pytest tests/ -v --cov=. --cov-report=term-missing
uvicorn api.main:app --reload --port 8001
```

## Key Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/status` | Full system status |
| POST | `/brain/{id}/run` | Manually trigger brain |
| POST | `/brain/{id}/disable` | Kill switch |
| POST | `/brain/{id}/enable` | Re-enable |
| GET | `/bus/messages` | Recent bus messages |

## Cron Schedules (Staggered)
| Brain | Schedule | Purpose |
|-------|----------|---------|
| Monitor | `*/5 * * * *` | Every 5min uptime check |
| Data | `5 2 * * *` | 02:05 UTC daily scrape |
| Update | `10 5 * * *` | 05:10 UTC content |
| Quality | event-driven | Pre-delivery gate |
| Cost | `5 * * * *` | Hourly budget check |
| Security | `15 * * * *` | Hourly security scan |
| Customer | `0 9,14,17 * * *` | 3x daily CRM |
| SEO | `20 6 * * *` | 06:20 UTC daily |

## Decision Loop (V2 — 5 steps)
1. OBSERVE — collect signals, check circuit breakers
2. CHECK — kill switch? budget? duplicate incident? idempotency key?
3. REASON — Claude analyzes, selects tier, posts to bus
4. ACT — T1: auto | T2: PR | T3: escalate (deduped, rate-limited)
5. LEARN — log to Postgres, update RAG runbooks

## Disclaimer
For informational purposes only. Not a licensed appraisal. © 2026 SevenNova.ai
