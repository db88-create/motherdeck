#!/usr/bin/env bash
# sync-to-airtable.sh
# Runs on NucBox to push OpenClaw telemetry data to Airtable.
# Install: crontab -e → */5 * * * * /home/claudeclaw/motherdeck/scripts/sync-to-airtable.sh
#
# Requires: AIRTABLE_PAT and AIRTABLE_BASE_ID env vars (or source from .env)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env.local"

# Load env
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

if [[ -z "${AIRTABLE_PAT:-}" || -z "${AIRTABLE_BASE_ID:-}" ]]; then
  echo "Missing AIRTABLE_PAT or AIRTABLE_BASE_ID" >&2
  exit 1
fi

BASE_URL="https://api.airtable.com/v0/$AIRTABLE_BASE_ID"
AUTH_HEADER="Authorization: Bearer $AIRTABLE_PAT"

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
DASHBOARD_DIR="$HOME/openclaw-dashboard"

# Helper: upsert a single record (delete old + create new for simple tables)
airtable_upsert() {
  local table="$1"
  local data="$2"
  curl -s -X POST "$BASE_URL/$table" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$data" > /dev/null
}

# Helper: clear and replace records in a table
airtable_replace_all() {
  local table="$1"
  local new_records="$2"

  # Get existing record IDs
  local existing
  existing=$(curl -s "$BASE_URL/$table?fields%5B%5D=Name&pageSize=100" \
    -H "$AUTH_HEADER" | python3 -c "
import json,sys
data=json.load(sys.stdin)
for r in data.get('records',[]):
    print(r['id'])
" 2>/dev/null || true)

  # Delete existing (max 10 per request)
  if [[ -n "$existing" ]]; then
    while IFS= read -r batch; do
      local params=""
      while IFS= read -r id; do
        [[ -z "$id" ]] && continue
        params+="records[]=$id&"
      done <<< "$batch"
      if [[ -n "$params" ]]; then
        curl -s -X DELETE "$BASE_URL/$table?$params" \
          -H "$AUTH_HEADER" > /dev/null
      fi
    done < <(echo "$existing" | paste - - - - - - - - - - | tr '\t' '\n')
  fi

  # Create new records
  if [[ -n "$new_records" && "$new_records" != "null" ]]; then
    echo "$new_records" | python3 -c "
import json,sys,subprocess
records = json.load(sys.stdin)
# Batch in groups of 10
for i in range(0, len(records), 10):
    batch = records[i:i+10]
    data = json.dumps({'records': [{'fields': r} for r in batch]})
    subprocess.run([
        'curl', '-s', '-X', 'POST',
        '$BASE_URL/$table',
        '-H', '$AUTH_HEADER',
        '-H', 'Content-Type: application/json',
        '-d', data
    ], capture_output=True)
" 2>/dev/null
  fi
}

echo "[$(date)] Starting Airtable sync..."

# --- 1. Gateway Health ---
echo "  Syncing gateway health..."
GW_PID=$(pgrep -f "openclaw-gateway" | head -1 || echo "")
if [[ -n "$GW_PID" ]]; then
  GW_MEM=$(ps -o rss= -p "$GW_PID" 2>/dev/null | awk '{printf "%.0f", $1/1024}')
  GW_UPTIME=$(ps -o etime= -p "$GW_PID" 2>/dev/null | xargs)
  GW_STATUS="online"
else
  GW_MEM=0
  GW_UPTIME="0"
  GW_STATUS="offline"
fi

airtable_replace_all "Gateway" "$(python3 -c "
import json
print(json.dumps([{
  'Status': '$GW_STATUS',
  'Uptime': '$GW_UPTIME',
  'MemoryMB': $GW_MEM,
  'PID': ${GW_PID:-0},
  'Version': '$(openclaw --version 2>/dev/null || echo unknown)',
  'UpdatedAt': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
}]))
")"

# --- 2. Cron Jobs ---
echo "  Syncing cron jobs..."
CRON_FILE="$OPENCLAW_HOME/cron/jobs.json"
if [[ -f "$CRON_FILE" ]]; then
  python3 -c "
import json, sys, datetime
with open('$CRON_FILE') as f:
    data = json.load(f)

jobs = data.get('jobs', data) if isinstance(data, dict) else data

records = []
for job in jobs:
    state = job.get('state', {})
    schedule = job.get('schedule', {})
    schedule_str = schedule.get('expr', str(schedule)) if isinstance(schedule, dict) else str(schedule)
    payload = job.get('payload', {})
    prompt = payload.get('message', '') if isinstance(payload, dict) else ''

    last_run_ms = state.get('lastRunAtMs', 0)
    last_run_str = ''
    if last_run_ms:
        last_run_str = datetime.datetime.fromtimestamp(last_run_ms / 1000, tz=datetime.timezone.utc).isoformat()

    duration_s = (state.get('lastDurationMs', 0) or 0) / 1000

    records.append({
        'Name': job.get('name', 'unknown'),
        'Schedule': schedule_str,
        'Status': 'error' if state.get('consecutiveErrors', 0) > 0 else ('active' if job.get('enabled', True) else 'paused'),
        'LastRun': last_run_str,
        'LastResult': state.get('lastRunStatus', ''),
        'LastDuration': round(duration_s, 1),
        'ConsecutiveErrors': state.get('consecutiveErrors', 0),
        'Description': prompt[:500],
        'UpdatedAt': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
    })
print(json.dumps(records))
" > /tmp/cron_records.json
  airtable_replace_all "CronJobs" "$(cat /tmp/cron_records.json)"
fi

# --- 3. Sessions ---
echo "  Syncing sessions..."
if [[ -f "$DASHBOARD_DIR/data.json" ]]; then
  python3 -c "
import json
with open('$DASHBOARD_DIR/data.json') as f:
    data = json.load(f)

records = []
for s in data.get('sessions', []):
    records.append({
        'Name': s.get('name', 'unknown'),
        'Type': s.get('type', 'main'),
        'Model': s.get('model', ''),
        'ContextPct': s.get('contextPct', 0),
        'TotalTokens': s.get('totalTokens', 0),
        'Cost': s.get('cost', 0),
        'Active': s.get('active', False),
        'LastActivity': s.get('lastActivity', ''),
        'UpdatedAt': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
    })
print(json.dumps(records))
" > /tmp/session_records.json
  airtable_replace_all "Sessions" "$(cat /tmp/session_records.json)"
fi

# --- 4. Usage Metrics (daily aggregation) ---
echo "  Syncing usage metrics..."
if [[ -f "$DASHBOARD_DIR/data.json" ]]; then
  python3 -c "
import json
with open('$DASHBOARD_DIR/data.json') as f:
    data = json.load(f)

records = []
for day in data.get('dailyChart', []):
    date = day.get('date', '')
    for model, cost in day.get('models', {}).items():
        token_data = day.get('tokensByModel', {}).get(model, {})
        records.append({
            'Date': date,
            'Model': model,
            'Calls': token_data.get('calls', 0),
            'InputTokens': token_data.get('input', 0),
            'OutputTokens': token_data.get('output', 0),
            'CacheReadTokens': token_data.get('cacheRead', 0),
            'CacheWriteTokens': token_data.get('cacheWrite', 0),
            'TotalTokens': token_data.get('totalTokens', 0),
            'Cost': cost,
            'SubagentCost': 0,
            'SubagentRuns': 0,
        })
print(json.dumps(records))
" > /tmp/usage_records.json
  airtable_replace_all "UsageMetrics" "$(cat /tmp/usage_records.json)"
fi

# --- 5. Skills ---
echo "  Syncing skills..."
SKILLS_DIR="$OPENCLAW_HOME/workspace/skills"
if [[ -d "$SKILLS_DIR" ]]; then
  python3 -c "
import json, os, glob

skills_dir = '$SKILLS_DIR'
records = []
for skill_dir in sorted(glob.glob(os.path.join(skills_dir, '*'))):
    if not os.path.isdir(skill_dir):
        continue
    name = os.path.basename(skill_dir)
    skill_file = os.path.join(skill_dir, 'SKILL.md')
    desc = ''
    if os.path.exists(skill_file):
        with open(skill_file) as f:
            lines = f.readlines()
            for line in lines:
                if line.strip() and not line.startswith('#'):
                    desc = line.strip()[:200]
                    break

    records.append({
        'Name': name,
        'Status': 'active',
        'Description': desc,
        'Category': '',
        'UpdatedAt': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
    })
print(json.dumps(records))
" > /tmp/skill_records.json
  airtable_replace_all "Skills" "$(cat /tmp/skill_records.json)"
fi

echo "[$(date)] Sync complete."
