"""
SevenNova RAG — Index Builder Script
Run this once to build the Chroma index.

Usage:
    python build_index.py
    python build_index.py --rebuild  # Force full rebuild
"""
import argparse
import sys
import time

import structlog

# Configure logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)

log = structlog.get_logger()


def main():
    parser = argparse.ArgumentParser(description="Build SevenNova RAG index")
    parser.add_argument("--rebuild", action="store_true", help="Force full rebuild")
    args = parser.parse_args()

    log.info("build_index_start", force_rebuild=args.rebuild)
    start = time.time()

    try:
        from core.rag_engine import SevenNovaRAG
        rag = SevenNovaRAG()
        counts = rag.build_index(force_rebuild=args.rebuild)

        elapsed = time.time() - start
        log.info(
            "build_index_complete",
            collections=counts,
            total_documents=sum(counts.values()),
            elapsed_seconds=round(elapsed, 2),
        )

        # Print stats
        print("\n" + "="*50)
        print("SevenNova RAG Index Built Successfully")
        print("="*50)
        for collection, count in counts.items():
            print(f"  {collection}: {count} documents")
        print(f"  Total: {sum(counts.values())} documents")
        print(f"  Time: {elapsed:.1f}s")
        print("="*50)

        # Verify with test query
        print("\nVerification query: 'TOC Tier 3 density bonus'")
        results = rag.query("TOC Tier 3 density bonus", n_results=2)
        for r in results:
            print(f"  [{r['similarity_score']:.0f}% match] {r['text'][:100]}...")

        print("\n[OK] Index ready. RAG is operational.\n")

    except Exception as e:
        log.error("build_index_failed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    main()
