# Anthropic Usage Endpoint — Claude Code Prompt

**Paste this into Claude Code to build the real usage tracking.**

---

## Task

Build a real usage endpoint that:
1. Reads the Anthropic API key from OpenClaw's environment
2. Fetches actual usage data from Anthropic's API
3. Returns real cost/token data to the UI
4. Caches results to avoid hammering the API

---

## Location

Update: `src/app/api/usage/route.ts`

Replace the existing endpoint (which pulls from Airtable) with one that hits Anthropic directly.

---

## Implementation

### 1. Read API Key from Environment

```typescript
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicApiKey) {
  throw new Error("ANTHROPIC_API_KEY not set in environment");
}
```

The key should be exposed by OpenClaw at runtime. If not available, return an error with instructions.

### 2. Fetch from Anthropic API

Anthropic's usage endpoint (for token counting and billing insights):
- **Endpoint:** `https://api.anthropic.com/v1/tokens/count`
- **Authentication:** Bearer token in Authorization header
- **Headers:** `"anthropic-version": "2023-06-01"`

For historical usage, Anthropic may expose:
- `https://api.anthropic.com/v1/account/usage` (if available)
- Or we query the last N days of message costs based on your API key

### 3. Calculate Costs

Use Anthropic's current pricing:
- **Haiku:** $0.80 / 1M input, $4.00 / 1M output
- **Sonnet:** $3.00 / 1M input, $15.00 / 1M output
- **Opus (if used):** $15.00 / 1M input, $75.00 / 1M output

Example calculation:
```typescript
const PRICING = {
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-1': { input: 15.00, output: 75.00 },
};

function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const prices = PRICING[model];
  if (!prices) return 0;
  return (tokensIn * prices.input + tokensOut * prices.output) / 1_000_000;
}
```

### 4. Response Structure

Return the same shape as before (for the UI to stay compatible):

```typescript
interface UsageData {
  costs: {
    today: number;
    sevenDay: number;
    thirtyDay: number;
    allTime: number;
    projectedMonthly: number;
    dailyBudget: number;      // 5
    monthlyBudget: number;     // 150
  };
  tokens: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  models: Array<{
    model: string;
    cost: number;
    calls: number;
    tokens: number;
  }>;
  dailyChart: Array<{
    date: string;
    cost: number;
    tokens: number;
    calls: number;
    models: Record<string, number>;
  }>;
}
```

### 5. Caching

Cache results in memory for 5 minutes (300s) to avoid API hammering:

```typescript
let cachedUsage: { data: UsageData; timestamp: number } | null = null;
const CACHE_TTL = 300_000; // 5 minutes

async function getCachedUsage(): Promise<UsageData> {
  const now = Date.now();
  if (cachedUsage && now - cachedUsage.timestamp < CACHE_TTL) {
    return cachedUsage.data;
  }
  
  const data = await fetchFromAnthropic();
  cachedUsage = { data, timestamp: now };
  return data;
}
```

### 6. Error Handling

If Anthropic API fails or key is missing:
- Return a helpful error message
- Include instructions to set `ANTHROPIC_API_KEY`
- Fallback to empty data rather than crashing

---

## Anthropic API Reference

**For token counting:**
```bash
curl https://api.anthropic.com/v1/tokens/count \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model": "claude-3-5-sonnet-20241022", "messages": [{"role": "user", "content": "hello"}]}'
```

**Current models:**
- `claude-3-5-sonnet-20241022` → Sonnet 4.6
- `claude-3-5-haiku-20241022` → Haiku 4.5
- `claude-opus-4-1-20250805` → Opus (if you have access)

---

## Notes

- **Real data:** After this, the usage dashboard will show actual Anthropic costs
- **No Airtable needed:** We're hitting Anthropic directly
- **Self-updating:** UI polls every 5 min, cached results refresh as needed
- **Budget tracking:** Compare against Doug's $5/day and $150/month limits

---

## Testing

1. Make sure ANTHROPIC_API_KEY is set in motherdeck environment
2. Hit `/api/usage` from the browser
3. Should return real cost data
4. UI updates to show actual spend

---

This replaces the fake "UsageMetrics" table approach with real API data.
