# SevenNova Auto-Report Generator — Component 4

**Address in → Full HTML report out in < 60 seconds.**

## What This Does
- Accepts a property address + report tier
- Runs SevenNovaOrchestrator (all 15 skills)
- Renders Jinja2 HTML template with all analysis sections
- Saves report to disk with unique request ID
- Returns HTML via API or CLI

## Files
| File | Purpose |
|------|---------|
| `core/report_generator.py` | Main generator class |
| `templates/report.html` | Jinja2 HTML template |
| `api/report_routes.py` | FastAPI routes to add to main.py |
| `generate_report.py` | CLI tool for testing |
| `tests/test_report_generator.py` | Test suite |

## Quick Start
```bash
# CLI — generate one report
python generate_report.py "3612 W Jefferson Blvd" --zip 90016 --tier full --open

# API — POST to generate
curl -X POST http://localhost:8000/api/v1/report/html \
  -H "Content-Type: application/json" \
  -d '{"street": "3612 W Jefferson Blvd", "zip_code": "90016", "tier": "full"}' \
  -o report.html

# Run tests
pytest tests/ -v --cov=core --cov=api --cov-report=term-missing
```

## Add API Routes to Existing App
In `api/main.py`, add:
```python
from api.report_routes import router as report_router
app.include_router(report_router)
```

## Report Sections
1. Executive Summary
2. Zoning & Development Intelligence
3. Ensemble Valuation & Climate AVM
4. Distressed Asset Radar
5. Entitlement Velocity
6. Climate Risk Assessment
7. Strategic Recommendations
8. Risk Summary
9. Assumptions & Unverified Data
10. Skill Activation Log

## Latency
- P50: 30 seconds
- P95: 60 seconds
- P99: 90 seconds

## Cost
- $0.05–$0.22 per report (API costs only)
- 99%+ gross margin at $199 full report price

## Disclaimer
For informational purposes only. Not a licensed appraisal.
© 2026 SevenNova.ai
