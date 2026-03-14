#!/usr/bin/env python3
"""
usage-sync.py — Parse OpenClaw session files and sync usage data to Airtable.
Runs as part of the sync-to-airtable cron job.
"""

import json
import os
import glob
import urllib.request
from datetime import datetime, timezone, timedelta
from collections import defaultdict

AIRTABLE_PAT = os.environ.get("AIRTABLE_PAT", "")
AIRTABLE_BASE_ID = os.environ.get("AIRTABLE_BASE_ID", "")
SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/main/sessions")
CRON_DIR = os.path.expanduser("~/.openclaw/cron/runs")


def airtable_req(method, table, data=None, record_id=None):
    url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{table}"
    if record_id:
        url += f"/{record_id}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {AIRTABLE_PAT}")
    req.add_header("Content-Type", "application/json")
    if data:
        req.data = json.dumps(data).encode()
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  Airtable error: {e.code} {body[:200]}")
        return None


def parse_all_sessions():
    """Parse all session JSONL files for usage data."""
    all_files = glob.glob(os.path.join(SESSIONS_DIR, "*.jsonl")) + \
                glob.glob(os.path.join(CRON_DIR, "*.jsonl"))

    daily = defaultdict(lambda: defaultdict(lambda: {
        "calls": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "cache_read": 0,
        "cache_write": 0,
        "total_tokens": 0,
        "cost": 0.0,
    }))

    for sf in all_files:
        with open(sf) as f:
            for line in f:
                try:
                    d = json.loads(line)
                    if d.get("type") != "message":
                        continue
                    msg = d.get("message", {})
                    if msg.get("role") != "assistant":
                        continue
                    usage = msg.get("usage", {})
                    cost_data = usage.get("cost", {})
                    cost = cost_data.get("total", 0)
                    if cost <= 0:
                        continue

                    date_str = d.get("timestamp", "")[:10]
                    if not date_str:
                        continue

                    model = msg.get("model", "unknown")
                    # Normalize model names
                    if "sonnet" in model.lower():
                        model = "Claude Sonnet"
                    elif "haiku" in model.lower():
                        model = "Claude Haiku"
                    elif "opus" in model.lower():
                        model = "Claude Opus"

                    entry = daily[date_str][model]
                    entry["calls"] += 1
                    entry["input_tokens"] += usage.get("input", 0)
                    entry["output_tokens"] += usage.get("output", 0)
                    entry["cache_read"] += usage.get("cacheRead", 0)
                    entry["cache_write"] += usage.get("cacheWrite", 0)
                    entry["total_tokens"] += usage.get("totalTokens", 0)
                    entry["cost"] += cost
                except (json.JSONDecodeError, KeyError):
                    continue

    return daily


def sync_to_airtable(daily_data):
    """Sync parsed usage data to Airtable UsageMetrics table."""
    # First, get existing records to avoid duplicates
    existing = {}
    result = airtable_req("GET", "UsageMetrics?fields%5B%5D=Date&fields%5B%5D=Model")
    if result:
        for rec in result.get("records", []):
            key = f"{rec['fields'].get('Date', '')}|{rec['fields'].get('Model', '')}"
            existing[key] = rec["id"]

    created = 0
    updated = 0

    for date_str, models in sorted(daily_data.items()):
        for model, stats in models.items():
            key = f"{date_str}|{model}"
            fields = {
                "Date": date_str,
                "Model": model,
                "Calls": stats["calls"],
                "InputTokens": stats["input_tokens"],
                "OutputTokens": stats["output_tokens"],
                "CacheReadTokens": stats["cache_read"],
                "CacheWriteTokens": stats["cache_write"],
                "TotalTokens": stats["total_tokens"],
                "Cost": round(stats["cost"], 6),
                "SubagentCost": 0,
                "SubagentRuns": 0,
            }

            if key in existing:
                # Update existing record
                airtable_req("PATCH", "UsageMetrics", {"fields": fields}, existing[key])
                updated += 1
            else:
                # Create new record
                airtable_req("POST", "UsageMetrics", {"records": [{"fields": fields}]})
                created += 1

    return created, updated


def main():
    global AIRTABLE_PAT, AIRTABLE_BASE_ID

    if not AIRTABLE_PAT or not AIRTABLE_BASE_ID:
        # Try loading from .env.local
        env_path = os.path.expanduser("~/motherdeck/.env.local")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("AIRTABLE_PAT="):
                        AIRTABLE_PAT = line.split("=", 1)[1]
                        os.environ["AIRTABLE_PAT"] = AIRTABLE_PAT
                    elif line.startswith("AIRTABLE_BASE_ID="):
                        AIRTABLE_BASE_ID = line.split("=", 1)[1]
                        os.environ["AIRTABLE_BASE_ID"] = AIRTABLE_BASE_ID

    AIRTABLE_PAT = os.environ.get("AIRTABLE_PAT", AIRTABLE_PAT)
    AIRTABLE_BASE_ID = os.environ.get("AIRTABLE_BASE_ID", AIRTABLE_BASE_ID)

    print("  Parsing session files...")
    daily_data = parse_all_sessions()
    total_days = len(daily_data)
    total_cost = sum(
        stats["cost"]
        for models in daily_data.values()
        for stats in models.values()
    )
    print(f"  Found {total_days} days of data, ${total_cost:.2f} total cost")

    print("  Syncing to Airtable...")
    created, updated = sync_to_airtable(daily_data)
    print(f"  Usage sync: {created} created, {updated} updated")


if __name__ == "__main__":
    main()
