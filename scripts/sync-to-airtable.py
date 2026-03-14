#!/usr/bin/env python3
"""
sync-to-airtable.py — Push OpenClaw telemetry data to Airtable.
Run every 5 minutes via cron:
  */5 * * * * /usr/bin/python3 /home/claudeclaw/motherdeck/scripts/sync-to-airtable.py
"""

import json
import os
import glob
import datetime
import subprocess
import urllib.request
import urllib.error
import sys

# Load env from .env.local
ENV_FILE = os.path.join(os.path.dirname(__file__), '..', '.env.local')
env = {}
if os.path.exists(ENV_FILE):
    with open(ENV_FILE) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k] = v

PAT = env.get('AIRTABLE_PAT', os.environ.get('AIRTABLE_PAT', ''))
BASE_ID = env.get('AIRTABLE_BASE_ID', os.environ.get('AIRTABLE_BASE_ID', ''))
if not PAT or not BASE_ID:
    print("Missing AIRTABLE_PAT or AIRTABLE_BASE_ID", file=sys.stderr)
    sys.exit(1)

BASE_URL = f"https://api.airtable.com/v0/{BASE_ID}"
OPENCLAW_HOME = os.path.expanduser("~/.openclaw")
DASHBOARD_DIR = os.path.expanduser("~/openclaw-dashboard")


def api_request(method, path, data=None):
    url = f"{BASE_URL}/{path}"
    payload = json.dumps(data).encode() if data else None
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Authorization': f'Bearer {PAT}',
            'Content-Type': 'application/json',
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  API error {e.code} on {method} {path}: {body[:200]}", file=sys.stderr)
        return None


def get_all_records(table):
    records = []
    offset = None
    while True:
        path = f"{table}?pageSize=100"
        if offset:
            path += f"&offset={offset}"
        resp = api_request("GET", path)
        if not resp:
            break
        records.extend(resp.get('records', []))
        offset = resp.get('offset')
        if not offset:
            break
    return records


def delete_all_records(table):
    records = get_all_records(table)
    ids = [r['id'] for r in records]
    # Delete in batches of 10
    for i in range(0, len(ids), 10):
        batch = ids[i:i+10]
        params = '&'.join(f'records[]={rid}' for rid in batch)
        api_request("DELETE", f"{table}?{params}")


def create_records(table, records):
    """Create records in batches of 10, cleaning select field values."""
    created = 0
    for i in range(0, len(records), 10):
        batch = records[i:i+10]
        resp = api_request("POST", table, {
            'records': [{'fields': r} for r in batch]
        })
        if resp:
            created += len(resp.get('records', []))
        else:
            # Try one at a time to find the bad record
            for rec in batch:
                resp2 = api_request("POST", table, {
                    'records': [{'fields': rec}]
                })
                if resp2:
                    created += 1
    return created


def replace_table(table, records):
    if not records:
        return
    delete_all_records(table)
    count = create_records(table, records)
    print(f"  {table}: {count} records synced")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


# ---- 1. Gateway Health ----
def sync_gateway():
    print("  Syncing gateway...")
    try:
        pid = subprocess.check_output(
            ['pgrep', '-f', 'openclaw-gateway'],
            text=True
        ).strip().split('\n')[0]
    except subprocess.CalledProcessError:
        pid = None

    if pid:
        try:
            mem_kb = subprocess.check_output(['ps', '-o', 'rss=', '-p', pid], text=True).strip()
            mem_mb = int(mem_kb) // 1024
        except Exception:
            mem_mb = 0
        try:
            uptime = subprocess.check_output(['ps', '-o', 'etime=', '-p', pid], text=True).strip()
        except Exception:
            uptime = "unknown"
        status = "online"
    else:
        mem_mb = 0
        uptime = "0"
        status = "offline"
        pid = "0"

    try:
        version = subprocess.check_output(['openclaw', '--version'], text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        version = "unknown"

    replace_table("Gateway", [{
        'Status': status,
        'Uptime': uptime,
        'MemoryMB': mem_mb,
        'PID': int(pid),
        'Version': version,
        'UpdatedAt': now_iso(),
    }])


# ---- 2. Cron Jobs ----
def sync_cron_jobs():
    print("  Syncing cron jobs...")
    cron_file = os.path.join(OPENCLAW_HOME, 'cron', 'jobs.json')
    if not os.path.exists(cron_file):
        return

    with open(cron_file) as f:
        data = json.load(f)

    jobs = data.get('jobs', data) if isinstance(data, dict) else data

    VALID_RESULTS = {'success', 'error', 'timeout'}
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
            last_run_str = datetime.datetime.fromtimestamp(
                last_run_ms / 1000, tz=datetime.timezone.utc
            ).isoformat()

        duration_s = (state.get('lastDurationMs', 0) or 0) / 1000
        last_result = state.get('lastRunStatus', '')

        rec = {
            'Name': job.get('name', 'unknown'),
            'Schedule': schedule_str,
            'Status': 'error' if state.get('consecutiveErrors', 0) > 0 else ('active' if job.get('enabled', True) else 'paused'),
            'LastRun': last_run_str,
            'LastDuration': round(duration_s, 1),
            'ConsecutiveErrors': state.get('consecutiveErrors', 0),
            'Description': prompt[:500],
            'UpdatedAt': now_iso(),
        }
        # Only include LastResult if it's a valid select option
        if last_result in VALID_RESULTS:
            rec['LastResult'] = last_result

        records.append(rec)

    replace_table("CronJobs", records)


# ---- 3. Sessions ----
def sync_sessions():
    print("  Syncing sessions...")
    data_file = os.path.join(DASHBOARD_DIR, 'data.json')
    if not os.path.exists(data_file):
        return

    with open(data_file) as f:
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
            'UpdatedAt': now_iso(),
        })

    replace_table("Sessions", records)


# ---- 4. Usage Metrics ----
def sync_usage():
    print("  Syncing usage metrics...")
    data_file = os.path.join(DASHBOARD_DIR, 'data.json')
    if not os.path.exists(data_file):
        return

    with open(data_file) as f:
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

    replace_table("UsageMetrics", records)


# ---- 5. Skills ----
def sync_skills():
    print("  Syncing skills...")
    skills_dir = os.path.join(OPENCLAW_HOME, 'workspace', 'skills')
    if not os.path.isdir(skills_dir):
        return

    records = []
    for skill_dir in sorted(glob.glob(os.path.join(skills_dir, '*'))):
        if not os.path.isdir(skill_dir):
            continue
        name = os.path.basename(skill_dir)
        skill_file = os.path.join(skill_dir, 'SKILL.md')
        desc = ''
        if os.path.exists(skill_file):
            with open(skill_file) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        desc = line.strip()[:200]
                        break

        records.append({
            'Name': name,
            'Status': 'active',
            'Description': desc,
            'Category': '',
            'UpdatedAt': now_iso(),
        })

    replace_table("Skills", records)


if __name__ == '__main__':
    print(f"[{datetime.datetime.now()}] Starting Airtable sync...")
    sync_gateway()
    sync_cron_jobs()
    sync_sessions()
    sync_usage()
    sync_skills()
    print(f"[{datetime.datetime.now()}] Sync complete.")


# ============ USAGE METRICS ============
def sync_usage():
    """Sync usage data from session files to Airtable."""
    import subprocess
    result = subprocess.run(
        ['python3', os.path.join(os.path.dirname(__file__), 'usage-sync.py')],
        capture_output=True, text=True, timeout=60
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)

# Run usage sync
print("  Syncing usage metrics...")
try:
    sync_usage()
except Exception as e:
    print(f"  Usage sync error: {e}")
