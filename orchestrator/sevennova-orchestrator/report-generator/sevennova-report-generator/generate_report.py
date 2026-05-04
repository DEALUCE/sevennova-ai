"""
SevenNova Report Generator — CLI Tool
Generate reports from the command line for testing.

Usage:
    python generate_report.py "3612 W Jefferson Blvd" --zip 90016 --tier full
    python generate_report.py "5281 W Pico Blvd" --tier institutional --open
"""
import argparse
import asyncio
import os
import sys
import webbrowser
from pathlib import Path

# Ensure orchestrator root is on sys.path so core.* resolves correctly
_orch_root = str(Path(__file__).parent.parent.parent)
if _orch_root in sys.path:
    sys.path.remove(_orch_root)
sys.path.insert(0, _orch_root)

# Load .env from orchestrator root
_env_file = Path(_orch_root) / ".env"
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file, override=True)
    except ImportError:
        pass  # dotenv optional

import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)


async def main():
    parser = argparse.ArgumentParser(description="SevenNova Report Generator")
    parser.add_argument("address", help='Property address e.g. "3612 W Jefferson Blvd"')
    parser.add_argument("--city", default="Los Angeles")
    parser.add_argument("--state", default="CA")
    parser.add_argument("--zip", dest="zip_code", default=None)
    parser.add_argument("--apn", default=None)
    parser.add_argument("--tier", choices=["basic", "full", "institutional"], default="full")
    parser.add_argument("--email", default=None)
    parser.add_argument("--open", dest="open_browser", action="store_true",
                        help="Open report in browser after generation")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"SevenNova.ai Report Generator")
    print(f"{'='*60}")
    print(f"Address: {args.address}, {args.city}, {args.state} {args.zip_code or ''}")
    print(f"Tier:    {args.tier.upper()}")
    print(f"{'='*60}\n")

    from core.report_generator import ReportGenerator
    generator = ReportGenerator()

    print("Generating report... (this may take 30-60 seconds)\n")

    result = await generator.generate(
        address=args.address,
        city=args.city,
        state=args.state,
        zip_code=args.zip_code,
        apn=args.apn,
        tier=args.tier,
        requester_email=args.email,
        save_to_disk=True,
    )

    print(f"\n{'='*60}")
    if result["success"]:
        report = result["report"]
        print(f"[OK] Report Generated Successfully")
        print(f"  Request ID:   {result['request_id']}")
        print(f"  Deal Score:   {report.deal_score.value}")
        print(f"  Confidence:   {report.overall_confidence:.0f}%")
        print(f"  Time:         {result['generation_time_seconds']}s")
        print(f"  File:         {result['file_path']}")
        print(f"  Skills:       {len([s for s in report.skills_activated if s.activated])}/15 active")
        if report.red_flags:
            print(f"\n  Red Flags ({len(report.red_flags)}):")
            for flag in report.red_flags:
                print(f"    [!] {flag}")
        print(f"\n  Recommendations:")
        for i, rec in enumerate(report.strategic_recommendations, 1):
            print(f"    {i}. {rec}")

        if args.open_browser and result["file_path"]:
            webbrowser.open(f"file://{Path(result['file_path']).resolve()}")
            print(f"\n  [OK] Opened in browser")
    else:
        print(f"[FAIL] Report Generation Failed")
        print(f"  Error: {result['error']}")
        sys.exit(1)

    print(f"{'='*60}")
    print(f"\nDisclaimer: For informational purposes only.")
    print(f"Not a licensed appraisal. © 2026 SevenNova.ai\n")


if __name__ == "__main__":
    asyncio.run(main())
