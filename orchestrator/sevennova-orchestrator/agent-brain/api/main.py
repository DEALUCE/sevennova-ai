"""
SevenNova Agent Brain v2 — FastAPI Application
HTTP interface for the Agent Brain system.

Endpoints:
  GET  /health              — health check
  GET  /status              — full system status
  POST /brain/{id}/run      — manually trigger a brain
  POST /brain/{id}/disable  — kill switch
  POST /brain/{id}/enable   — re-enable
  GET  /metrics             — Prometheus metrics
  POST /watchdog/heartbeat  — receive heartbeat from external watchdog
"""
from __future__ import annotations

import asyncio
import os
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from infra.models import BrainID
from supervisor.supervisor import SupervisorBrain, ExternalWatchdog

log = structlog.get_logger()

supervisor: SupervisorBrain | None = None
watchdog: ExternalWatchdog | None = None
_scheduler_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global supervisor, watchdog, _scheduler_task
    log.info("agent_brain_starting")
    supervisor = SupervisorBrain()
    watchdog = ExternalWatchdog()
    # Start background scheduler
    _scheduler_task = asyncio.create_task(_run_scheduler())
    log.info("agent_brain_ready")
    yield
    if _scheduler_task:
        _scheduler_task.cancel()
    log.info("agent_brain_shutdown")


app = FastAPI(
    title="SevenNova Agent Brain v2",
    description="Hierarchical multi-agent system — self-healing, 24/7",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "https://sevennova.ai").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


async def _run_scheduler():
    """
    Simple scheduler — checks every minute and fires brains on schedule.
    In production: replace with APScheduler or LangGraph crons.
    """
    import time
    from datetime import datetime

    log.info("scheduler_started")
    while True:
        try:
            now = datetime.utcnow()
            minute = now.minute
            hour = now.hour

            if supervisor:
                # Every 5 minutes — Monitor + Heartbeat
                if minute % 5 == 0:
                    asyncio.create_task(supervisor.run_monitor_cycle())

                # Daily 02:05 UTC — Data Brain
                if hour == 2 and minute == 5:
                    asyncio.create_task(supervisor.dispatch(BrainID.DATA))

                # Daily 05:10 UTC — Update Brain
                if hour == 5 and minute == 10:
                    asyncio.create_task(supervisor.dispatch(BrainID.UPDATE))

                # Hourly :05 — Cost Brain
                if minute == 5:
                    asyncio.create_task(supervisor.dispatch(BrainID.COST))

                # Hourly :15 — Security Brain
                if minute == 15:
                    asyncio.create_task(supervisor.dispatch(BrainID.SECURITY))

                # 09:00, 14:00, 17:00 UTC — Customer Brain
                if minute == 0 and hour in (9, 14, 17):
                    asyncio.create_task(supervisor.dispatch(BrainID.CUSTOMER))

                # Daily 06:20 UTC — SEO Brain
                if hour == 6 and minute == 20:
                    asyncio.create_task(supervisor.dispatch(BrainID.SEO))

        except Exception as e:
            log.error("scheduler_error", error=str(e))

        await asyncio.sleep(60)  # Check every minute


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "sevennova-agent-brain",
        "version": "2.0.0",
        "supervisor_ready": supervisor is not None,
    }


@app.get("/status")
async def status():
    if not supervisor:
        raise HTTPException(503, "Supervisor not initialized")
    return supervisor.get_system_status()


@app.post("/brain/{brain_id}/run")
async def run_brain(brain_id: str):
    if not supervisor:
        raise HTTPException(503, "Supervisor not initialized")
    try:
        bid = BrainID(brain_id)
    except ValueError:
        raise HTTPException(400, f"Unknown brain: {brain_id}")
    run_log = await supervisor.dispatch(bid)
    if not run_log:
        raise HTTPException(403, f"Brain {brain_id} is disabled or paused")
    return {
        "run_id": run_log.run_id,
        "brain": brain_id,
        "success": run_log.success,
        "duration_s": run_log.duration_seconds,
        "actions": run_log.actions_taken,
        "error": run_log.error,
    }


@app.post("/brain/{brain_id}/disable")
async def disable_brain(brain_id: str, reason: str = "Manual disable via API"):
    if not supervisor:
        raise HTTPException(503, "Supervisor not initialized")
    try:
        bid = BrainID(brain_id)
    except ValueError:
        raise HTTPException(400, f"Unknown brain: {brain_id}")
    supervisor.disable_brain(bid, reason)
    return {"disabled": brain_id, "reason": reason}


@app.post("/brain/{brain_id}/enable")
async def enable_brain(brain_id: str, reason: str = "Manual enable via API"):
    if not supervisor:
        raise HTTPException(503, "Supervisor not initialized")
    try:
        bid = BrainID(brain_id)
    except ValueError:
        raise HTTPException(400, f"Unknown brain: {brain_id}")
    supervisor.enable_brain(bid, reason)
    return {"enabled": brain_id, "reason": reason}


@app.post("/watchdog/heartbeat")
async def watchdog_heartbeat():
    """Endpoint for external watchdog to confirm Supervisor is alive."""
    if watchdog:
        watchdog.record_heartbeat()
    return {"alive": True, "timestamp": __import__('datetime').datetime.utcnow().isoformat()}


@app.get("/bus/messages")
async def bus_messages(limit: int = 50):
    if not supervisor:
        raise HTTPException(503, "Not initialized")
    messages = supervisor.bus.get_recent_messages(limit)
    return {
        "messages": [m.model_dump() for m in messages],
        "stats": supervisor.bus.get_stats(),
    }
