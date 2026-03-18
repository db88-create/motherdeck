# PrimeSight Network API Query Layer — Claude Code Prompt

**Paste this into Claude Code. Builds read-only API helpers for Doohly + GlassCast to give Mother network intelligence.**

---

## Mission

Create API query layer that lets Mother understand PrimeSight network status in real-time:
- Live screen counts
- Venue/location details
- Installation velocity (new installs per day/week)
- Installation health (% operational vs pending)
- Pending installations (what's in the pipeline)
- Offline/alert screens
- Geographic insights (which markets are strong/weak)

All read-only. Cached locally. Queryable from Mother's context.

---

## APIs to Integrate

### 1. Doohly CMS API
**Base URL:** (you'll provide)
**Auth:** (API key, you'll provide)

**Endpoints needed:**
- `GET /venues` — List all venues (name, location, address, contact, lease info)
- `GET /venues/{id}` — Single venue details
- `GET /screens` — All screens (venue_id, status, online/offline)
- `GET /screens/{id}/status` — Screen uptime/health
- `GET /installations` — Installation history (date, venue, status)

### 2. GlassCast Dashboard API
**Base URL:** (you'll provide)
**Auth:** (API key, you'll provide)

**Endpoints needed:**
- `GET /network/summary` — Live screen count, health score, pending count
- `GET /network/health` — Installation health (% operational, alerts)
- `GET /installations/pending` — What's being installed (date, venue, status)
- `GET /installations/velocity` — Recent install activity (trend)
- `GET /locations` — All locations with status
- `GET /locations/{id}/status` — Single location details

---

## Required Functions

Mother should be able to call these directly:

```python
# Network Overview
get_network_summary() 
  → {"live_screens": 1247, "health_percentage": 94.2, "pending_installations": 12}

get_installation_health() 
  → {"operational": 1167, "pending": 80, "offline": 12, "percentage": 94.2}

# Installation Velocity (insights)
get_installation_velocity()
  → {"today": 3, "this_week": 18, "this_month": 67, "trend": "up 15%"}

# Venue/Location Queries
get_all_venues()
  → List of all venues with (name, location, screens, status, lease_info)

get_venue_summary(venue_name)
  → {"name": "...", "location": "Miami", "screens": 8, "status": "operational", "installs": []}

get_location_status(market)
  → Summary for market (e.g., "Miami", "DC", "NYC")

# Installation Pipeline
get_pending_installations()
  → List of installations in progress (date, venue, expected_complete)

get_recent_installations(days=7)
  → Installs from last N days with timestamps

# Alerts
get_offline_screens()
  → List of screens currently offline with venues

get_alerts()
  → Any installation delays, health warnings, network issues

# Geographic Insights
get_markets_ranked_by_health()
  → Ranked list: Miami (98%), DC (92%), NYC (89%)...

get_installation_capacity_by_market()
  → Which markets have most pending work (installation velocity hotspots)
```

---

## Implementation Requirements

### Storage & Caching
- Cache API responses locally: `~/.openclaw/workspace/primesight-network-cache/`
- Structure:
  ```
  primesight-network-cache/
  ├─ venues.json (cached venue list)
  ├─ screens.json (cached screen status)
  ├─ installations.json (installation history)
  ├─ network-summary.json (live summary)
  ├─ health-metrics.json (health scores)
  └─ cache-metadata.json (timestamp, expiry)
  ```
- Refresh interval: 30 min (configurable)
- Validate freshness before returning

### Error Handling
- Graceful fallback to cache if API is down
- Log all API errors with timestamps
- Return cached data with `"source": "cache"` flag if fresh
- Return empty set with warning if cache stale

### Read-Only Enforcement
- Zero POST/PUT/DELETE operations
- All functions are GET only
- Document this constraint clearly

### Config File
Create `~/.openclaw/primesight-api-config.json`:
```json
{
  "doohly": {
    "base_url": "https://...",
    "api_key": "your-key-here",
    "enabled": true
  },
  "glasscash": {
    "base_url": "https://...",
    "api_key": "your-key-here", 
    "enabled": true
  },
  "cache": {
    "directory": "~/.openclaw/workspace/primesight-network-cache",
    "ttl_minutes": 30,
    "fallback_to_stale": true
  }
}
```

### Logging
- All queries logged to `~/.openclaw/workspace/primesight-network-cache/queries.log`
- Format: timestamp | function | response_time_ms | cache_hit | data_points
- Example: `2026-03-15 11:53:02 | get_network_summary | 234ms | cache_hit | live_screens=1247`

---

## File Structure

Create these in `/home/claudeclaw/.openclaw/workspace/`:

**primesight-api.py** (main module)
```python
#!/usr/bin/env python3
"""
PrimeSight Network API Query Layer
Provides read-only access to Doohly + GlassCast APIs
Caches locally for performance
"""

import requests
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any

class PrimeSightNetworkAPI:
    def __init__(self, config_path: str = "~/.openclaw/primesight-api-config.json"):
        self.config = self._load_config(config_path)
        self.cache_dir = Path(self.config['cache']['directory']).expanduser()
        self.cache_ttl = self.config['cache']['ttl_minutes']
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self._init_logger()
    
    def _load_config(self, path: str) -> Dict:
        """Load API config from file"""
        pass
    
    def _init_logger(self):
        """Initialize query logger"""
        pass
    
    # === NETWORK OVERVIEW ===
    def get_network_summary(self) -> Dict[str, Any]:
        """Live screen count, health %, pending installs"""
        pass
    
    def get_installation_health(self) -> Dict[str, Any]:
        """Operational vs pending vs offline breakdown"""
        pass
    
    # === INSTALLATION VELOCITY ===
    def get_installation_velocity(self) -> Dict[str, Any]:
        """Today, week, month trends"""
        pass
    
    def get_recent_installations(self, days: int = 7) -> List[Dict]:
        """Installs from last N days"""
        pass
    
    # === VENUE/LOCATION QUERIES ===
    def get_all_venues(self) -> List[Dict]:
        """All venues with status, location, screen count"""
        pass
    
    def get_venue_summary(self, venue_name: str) -> Dict[str, Any]:
        """Single venue details"""
        pass
    
    def get_location_status(self, market: str) -> Dict[str, Any]:
        """Market-level summary (Miami, DC, NYC, etc.)"""
        pass
    
    # === INSTALLATION PIPELINE ===
    def get_pending_installations(self) -> List[Dict]:
        """What's in progress"""
        pass
    
    # === ALERTS ===
    def get_offline_screens(self) -> List[Dict]:
        """Currently offline with venues"""
        pass
    
    def get_alerts(self) -> List[Dict]:
        """Health warnings, delays, issues"""
        pass
    
    # === GEOGRAPHIC INSIGHTS ===
    def get_markets_ranked_by_health(self) -> List[Dict]:
        """Markets ranked by % operational"""
        pass
    
    def get_installation_capacity_by_market(self) -> List[Dict]:
        """Which markets have most pending work"""
        pass
    
    # === CACHE MANAGEMENT ===
    def _get_cached(self, key: str) -> Any:
        """Retrieve from cache if fresh"""
        pass
    
    def _set_cache(self, key: str, data: Any):
        """Store in cache with timestamp"""
        pass
    
    def _is_cache_fresh(self, key: str) -> bool:
        """Check if cache is within TTL"""
        pass
    
    def refresh_cache(self):
        """Force refresh all cached data"""
        pass

# Singleton instance
api = PrimeSightNetworkAPI()

# Export for Mother's use
__all__ = [
    'get_network_summary',
    'get_installation_health',
    'get_installation_velocity',
    'get_all_venues',
    'get_venue_summary',
    'get_location_status',
    'get_pending_installations',
    'get_recent_installations',
    'get_offline_screens',
    'get_alerts',
    'get_markets_ranked_by_health',
    'get_installation_capacity_by_market',
]
```

**test-primesight-api.py** (for testing before wiring into Mother)
```python
#!/usr/bin/env python3
"""
Test script: Verify all API functions work correctly
Run with: python3 test-primesight-api.py
"""

from primesight_api import PrimeSightNetworkAPI

def test_all():
    api = PrimeSightNetworkAPI()
    
    print("Testing get_network_summary()...")
    summary = api.get_network_summary()
    print(f"  Live screens: {summary.get('live_screens')}")
    print(f"  Health: {summary.get('health_percentage')}%")
    
    print("\nTesting get_installation_velocity()...")
    velocity = api.get_installation_velocity()
    print(f"  Today: {velocity.get('today')}")
    print(f"  Week: {velocity.get('this_week')}")
    print(f"  Trend: {velocity.get('trend')}")
    
    print("\nTesting get_pending_installations()...")
    pending = api.get_pending_installations()
    print(f"  Pending count: {len(pending)}")
    
    print("\nTesting get_markets_ranked_by_health()...")
    markets = api.get_markets_ranked_by_health()
    for market in markets[:3]:
        print(f"  {market['name']}: {market['health']}%")
    
    print("\n✅ All tests passed!")

if __name__ == "__main__":
    test_all()
```

---

## Integration with Mother (Later)

Once built & tested, Mother can:

```python
# In Mother's context, anywhere:
from primesight_api import get_network_summary, get_installation_velocity

# Morning brief section:
summary = get_network_summary()
brief += f"🟢 {summary['live_screens']} screens live | {summary['health_percentage']}% health"

# Real-time query:
velocity = get_installation_velocity()
if velocity['trend'] == 'down':
    alert("Installation velocity declining")
```

---

## What You'll Provide

Before Claude Code builds this, I need:

1. **Doohly API credentials:**
   - Base URL
   - API Key
   - Example endpoint responses (so we know the schema)

2. **GlassCast Dashboard API credentials:**
   - Base URL
   - API Key
   - Example endpoint responses

3. **Market/location list:**
   - Which markets do you want tracked? (Miami, DC, NYC, Austin, etc.)

---

## Deliverables

✅ `primesight-api.py` — Full query module (500+ lines)
✅ `test-primesight-api.py` — Test suite
✅ `~/.openclaw/primesight-api-config.json` — Config template
✅ `primesight-network-cache/` directory structure
✅ Cache refresh logic + logging

Once tested, Mother can query network status from anywhere in her context.

---

## Next Steps

1. Build the module
2. Test against real APIs
3. Verify cache logic
4. Wire into Motherdeck Operations view
5. Add to morning brief (daily network snapshot)

---

This gives Mother real-time visibility into PrimeSight network health, installation velocity, and geographic performance. No write operations. All local, cached, queryable.
