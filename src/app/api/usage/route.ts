import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";
import {
  UsageMetricFields,
  CostSummary,
  TokenSummary,
  ModelBreakdown,
  DailyChartPoint,
} from "@/lib/types";

// Cache for 2 minutes to avoid hammering Airtable
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 120_000;

export async function GET() {
  try {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const records = await fetchAll<UsageMetricFields>("UsageMetrics", {
      sort: [{ field: "Date", direction: "desc" }],
    });

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
      .toISOString()
      .split("T")[0];

    let todayCost = 0;
    let sevenDayCost = 0;
    let thirtyDayCost = 0;
    let allTimeCost = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCacheRead = 0;
    let totalCacheWrite = 0;
    let totalTokens = 0;

    const modelMap = new Map<
      string,
      { cost: number; calls: number; tokens: number }
    >();
    const dailyMap = new Map<
      string,
      { cost: number; tokens: number; calls: number; models: Record<string, number> }
    >();

    // Count days with data for projection
    const daysWithData = new Set<string>();

    for (const rec of records) {
      const f = rec.fields;
      const cost = f.Cost || 0;
      const date = f.Date || "";

      allTimeCost += cost;
      totalInput += f.InputTokens || 0;
      totalOutput += f.OutputTokens || 0;
      totalCacheRead += f.CacheReadTokens || 0;
      totalCacheWrite += f.CacheWriteTokens || 0;
      totalTokens += f.TotalTokens || 0;

      if (date >= today) todayCost += cost;
      if (date >= sevenDaysAgo) sevenDayCost += cost;
      if (date >= thirtyDaysAgo) {
        thirtyDayCost += cost;
        if (cost > 0) daysWithData.add(date);
      }

      // Model breakdown
      const model = f.Model || "Unknown";
      const existing = modelMap.get(model) || { cost: 0, calls: 0, tokens: 0 };
      existing.cost += cost;
      existing.calls += f.Calls || 0;
      existing.tokens += f.TotalTokens || 0;
      modelMap.set(model, existing);

      // Daily chart
      if (date) {
        const day = dailyMap.get(date) || {
          cost: 0,
          tokens: 0,
          calls: 0,
          models: {},
        };
        day.cost += cost;
        day.tokens += f.TotalTokens || 0;
        day.calls += f.Calls || 0;
        day.models[model] = (day.models[model] || 0) + cost;
        dailyMap.set(date, day);
      }
    }

    // Project monthly cost based on actual daily average
    const activeDays = daysWithData.size || 1;
    const dailyAvg = thirtyDayCost / activeDays;
    const projectedMonthly = dailyAvg * 30;

    const costs: CostSummary = {
      today: Math.round(todayCost * 100) / 100,
      sevenDay: Math.round(sevenDayCost * 100) / 100,
      thirtyDay: Math.round(thirtyDayCost * 100) / 100,
      allTime: Math.round(allTimeCost * 100) / 100,
      projectedMonthly: Math.round(projectedMonthly * 100) / 100,
      dailyBudget: 5,
      monthlyBudget: 150,
    };

    const tokens: TokenSummary = {
      input: totalInput,
      output: totalOutput,
      cacheRead: totalCacheRead,
      cacheWrite: totalCacheWrite,
      total: totalTokens,
    };

    const models: ModelBreakdown[] = Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model,
        cost: Math.round(data.cost * 100) / 100,
        calls: data.calls,
        tokens: data.tokens,
      }))
      .sort((a, b) => b.cost - a.cost);

    const dailyChart: DailyChartPoint[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        cost: Math.round(data.cost * 10000) / 10000,
        tokens: data.tokens,
        calls: data.calls,
        models: data.models,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    const result = { costs, tokens, models, dailyChart };
    cache = { data: result, timestamp: now };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[usage] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
