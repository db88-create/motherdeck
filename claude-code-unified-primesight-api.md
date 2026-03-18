# Unified PrimeSight Network API — Claude Code Prompt

**Paste this directly into Claude Code. Builds comprehensive API layer for Doohly + GlassCast with flexible reporting.**

---

## Mission

Create a unified, read-only API layer that captures **everything** from Doohly CMS and GlassCast Dashboard. Structure the data so Mother can flexibly carve out whatever reporting is needed (network health, install velocity, venue details, market performance, etc.) without rebuilding the API.

---

## Core Principles

✅ **Comprehensive:** Fetch all available data from both APIs (don't leave anything behind)
✅ **Unified:** Single query interface regardless of source
✅ **Flexible:** Raw data cached locally; carving out reports is client responsibility
✅ **Read-Only:** Zero write operations; safe cache-first architecture
✅ **Extensible:** Structure ready for Firefly, LG, Vistar later

---

## What to Fetch (Everything)

### From Doohly CMS
**Venues:**
- All venue records (name, address, location, contact, lease info, market)
- Venue metadata (created_date, updated_date, status)

**Screens:**
- All screen records (screen_id, venue_id, hardware_type, serial, firmware)
- Screen status (online/offline, last_heartbeat, uptime_percentage)
- Screen content/scheduling (current_content, playback_status)

**Installations:**
- Installation history (date, venue, who, status, notes)
- Pending/in-progress installations

**Content/Media:**
- Media library (what content is available)
- Scheduling (what's playing where)

**Reports/Analytics:**
- Any KPIs or metrics Doohly tracks

### From GlassCast Dashboard API
**Network Summary:**
- Total live screens
- Operational percentage
- Pending installations count
- Health score

**Installation Metrics:**
- Recent install activity (timeline)
- Install velocity (rate)
- Pending work queue
- Installation health (% done)

**Location/Market Data:**
- All locations (market, name, screen count, status)
- Location health metrics
- Geographic performance

**Alerts/Health:**
- Offline screens
- Overdue installations
- System alerts
- Performance warnings

**Operational Metrics:**
- Uptime data
- Performance metrics
- Capacity utilization

---

## Storage Structure

All data stored locally and refreshed on schedule:

```
~/.openclaw/workspace/primesight-api/
├─ config/
│  └─ primesight-api-config.json (credentials, settings)
├─ cache/
│  ├─ doohly/
│  │  ├─ venues.json (all venue records)
│  │  ├─ screens.json (all screen records + status)
│  │  ├─ installations.json (install history)
│  │  ├─ content.json (media/scheduling)
│  │  └─ metadata.json (cache timestamps)
│  ├─ glasscash/
│  │  ├─ network-summary.json
│  │  ├─ installations.json
│  │  ├─ locations.json
│  │  ├─ alerts.json
│  │  ├─ metrics.json
│  │  └─ metadata.json
│  └─ unified/
│     ├─ all-venues.json (merged, deduplicated)
│     ├─ all-screens.json (merged, deduplicated)
│     ├─ all-installations.json (merged timeline)
│     └─ last-refresh.json (when each source was synced)
├─ logs/
│  ├─ queries.log (every query + response time)
│  └─ errors.log (API errors, fallbacks)
└─ primesight_api.py (main module)
```

---

## API Module Structure

**primesight_api.py** provides these groups of functions:

### 1. Raw Data Access (direct from cache)
```python
# Doohly data
get_doohly_venues()          # All venues with full details
get_doohly_screens()         # All screens + status
get_doohly_installations()   # Install history from Doohly
get_doohly_content()         # Media/scheduling info

# GlassCast data
get_glasscash_network_summary()   # Live counts, health, pending
get_glasscash_installations()     # Install metrics, velocity, pending
get_glasscash_locations()         # Market-level data
get_glasscash_alerts()            # Offline, delays, warnings
get_glasscash_metrics()           # Performance, uptime, etc.

# Unified data (merged from both sources)
get_all_venues()             # Merged venue list
get_all_screens()            # Merged screen list
get_all_installations()      # Complete install timeline
```

### 2. Query Functions (flexible filtering)
```python
# Venue queries
venues_by_market(market)     # Get all venues in Miami, DC, etc.
venue_by_name(name)          # Single venue details
venues_with_status(status)   # Operational, pending, offline

# Screen queries
screens_by_venue(venue_id)   # Screens in a specific venue
screens_by_status(status)    # Online, offline, error
screens_offline()            # All currently offline
screens_by_market(market)    # Screens in a market

# Installation queries
installations_by_venue(venue_id)       # History for one venue
installations_by_market(market)        # Activity in a market
installations_pending()                # In progress
installations_completed(days=30)       # Completed in last N days
installations_by_date_range(start, end)  # Custom date range

# Status/Health queries
venue_health_score(venue_id)           # Health % for venue
market_health_ranking()                # All markets ranked
screen_health_trend()                  # Trending up/down
installation_velocity(period='week')   # Rate of new installs
```

### 3. Reporting Helpers (pre-built summaries)
```python
# These return structured data for easy reporting
network_status_summary()          # Quick overview: screens, health, pending
market_performance_report()       # All markets ranked by health, activity
installation_pipeline_report()    # What's pending, timeline, blockers
venue_audit_report()              # All venues with status, installs, issues
operational_alerts_summary()      # What needs attention
geographic_heatmap_data()         # Markets ranked by performance
```

### 4. Cache Management
```python
refresh_all()                 # Force refresh from APIs
refresh_doohly()              # Refresh just Doohly
refresh_glasscash()           # Refresh just GlassCast
cache_age()                   # How old is cached data
cache_status()                # What's cached, what's stale
```

---

## Implementation Details

### Configuration
Create `~/.openclaw/primesight-api-config.json`:
```json
{
  "doohly": {
    "base_url": "https://your-doohly-instance.com",
    "api_key": "your-api-key",
    "enabled": true,
    "timeout_seconds": 30
  },
  "glasscash": {
    "base_url": "https://your-glasscash-dashboard.com",
    "api_key": "your-api-key",
    "enabled": true,
    "timeout_seconds": 30
  },
  "cache": {
    "directory": "~/.openclaw/workspace/primesight-api",
    "ttl_minutes": 30,
    "fallback_to_stale": true
  },
  "logging": {
    "level": "INFO",
    "log_queries": true
  },
  "markets": [
    "Miami",
    "DC",
    "NYC",
    "Austin"
  ]
}
```

### Error Handling
- If API fails: return cached data (with `"source": "cache"` flag)
- If cache is stale: log warning, return with freshness indicator
- All errors logged with timestamp + API endpoint
- Retry logic: 3 attempts with exponential backoff

### Logging
Every query logged to `~/.openclaw/workspace/primesight-api/logs/queries.log`:
```
2026-03-15 12:00:00 | get_all_venues | 234ms | 150 records | fresh
2026-03-15 12:01:15 | installations_pending | 89ms | 12 records | fresh
2026-03-15 12:02:30 | screens_offline | cache hit | 4 records | 5min old
```

### Return Format (Consistent)
All functions return JSON-serializable dicts:
```json
{
  "success": true,
  "source": "fresh|cache",
  "timestamp": "2026-03-15T12:00:00Z",
  "cache_age_minutes": 0,
  "data": [...],
  "count": 150,
  "metadata": {
    "api": "doohly|glasscash|unified",
    "query": "get_all_venues",
    "response_time_ms": 234
  }
}
```

---

## Test Suite

Build `test-primesight-api.py`:
```python
#!/usr/bin/env python3
"""
Test all API functions and verify both sources are working
Run: python3 test-primesight-api.py
"""

def test_all():
    from primesight_api import *
    
    print("=== Testing Doohly ===")
    venues = get_doohly_venues()
    print(f"✓ Venues: {venues['count']}")
    
    screens = get_doohly_screens()
    print(f"✓ Screens: {screens['count']}")
    
    print("\n=== Testing GlassCash ===")
    summary = get_glasscash_network_summary()
    print(f"✓ Live screens: {summary['data']['live_screens']}")
    print(f"✓ Health: {summary['data']['health_percentage']}%")
    
    print("\n=== Testing Queries ===")
    miami = venues_by_market('Miami')
    print(f"✓ Miami venues: {miami['count']}")
    
    pending = installations_pending()
    print(f"✓ Pending: {pending['count']}")
    
    print("\n=== Testing Reports ===")
    report = network_status_summary()
    print(f"✓ Network status retrieved")
    
    market_report = market_performance_report()
    print(f"✓ Market rankings: {len(market_report['data'])} markets")
    
    print("\n✅ All tests passed!")
```

---

## Deliverables

✅ `primesight_api.py` — Full module (all data fetching + queries + caching)
✅ `test-primesight-api.py` — Test suite
✅ `primesight-api-config.json` — Config template
✅ Cache directory structure
✅ Logging infrastructure
✅ Error handling + fallback logic

---

## Usage (For Mother)

Once built, Mother can use anywhere:

```python
# Get everything from cache
venues = get_all_venues()
screens = get_all_screens()
installs = get_all_installations()

# Query flexibly
miami_screens = screens_by_market('Miami')
offline = screens_offline()
pending_work = installations_pending()

# Generate reports
network = network_status_summary()
markets = market_performance_report()
alerts = operational_alerts_summary()

# Carve out custom reporting
if pending_work['count'] > 20:
    report = f"Installation backlog high: {pending_work['count']} pending"
```

---

## Integration (Later)

- Wire into **Motherdeck Operations view** (real-time dashboard)
- Add to **morning brief** (network status snapshot)
- Create **custom reports** as needed (no API changes required)

---

## You'll Provide

Before Claude Code builds:

1. **Doohly API:**
   - Base URL
   - API key
   - Example JSON response from 3-4 endpoints (so we know the schema)

2. **GlassCast Dashboard API:**
   - Base URL
   - API key
   - Example JSON responses from key endpoints

3. **Market list:** Which markets should be recognized? (Miami, DC, NYC, Austin, etc.)

---

## Go Build It

This captures everything comprehensively. Mother can then query however she wants for reporting without rebuilding the API.

Next: Add Firefly/LG/Vistar sources in the same folder structure when ready.
