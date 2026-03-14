import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";
import {
  UsageMetricFields,
  CostSummary,
  TokenSummary,
  ModelBreakdown,
  DailyChartPoint,
} from "@/lib/types";

export async function GET() {
  try {
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

    let costToday = 0;
    let cost7d = 0;
    let cost30d = 0;
    let costAllTime = 0;
    const tokenSummary: TokenSummary = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    };
    const modelMap = new Map<
      string,
      { cost: number; calls: number; tokens: number }
    >();
    const dailyMap = new Map<
      string,
      { cost: number; tokens: number; calls: number; models: Record<string, number> }
    >();

    for (const record of records) {
      const f = record.fields;
      const date = f.Date;
      const cost = f.Cost || 0;

      costAllTime += cost;
      if (date >= thirtyDaysAgo) cost30d += cost;
      if (date >= sevenDaysAgo) cost7d += cost;
      if (date === today) costToday += cost;

      tokenSummary.input += f.InputTokens || 0;
      tokenSummary.output += f.OutputTokens || 0;
      tokenSummary.cacheRead += f.CacheReadTokens || 0;
      tokenSummary.cacheWrite += f.CacheWriteTokens || 0;
      tokenSummary.total += f.TotalTokens || 0;

      const existing = modelMap.get(f.Model) || {
        cost: 0,
        calls: 0,
        tokens: 0,
      };
      existing.cost += cost;
      existing.calls += f.Calls || 0;
      existing.tokens += f.TotalTokens || 0;
      modelMap.set(f.Model, existing);

      const daily = dailyMap.get(date) || {
        cost: 0,
        tokens: 0,
        calls: 0,
        models: {},
      };
      daily.cost += cost;
      daily.tokens += f.TotalTokens || 0;
      daily.calls += f.Calls || 0;
      daily.models[f.Model] = (daily.models[f.Model] || 0) + cost;
      dailyMap.set(date, daily);
    }

    const daysWithData = dailyMap.size || 1;
    const avgDailyCost = costAllTime / daysWithData;

    const costs: CostSummary = {
      today: costToday,
      sevenDay: cost7d,
      thirtyDay: cost30d,
      allTime: costAllTime,
      projectedMonthly: avgDailyCost * 30,
      dailyBudget: 5,
      monthlyBudget: 150,
    };

    const models: ModelBreakdown[] = Array.from(modelMap.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost);

    const dailyChart: DailyChartPoint[] = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return NextResponse.json({
      costs,
      tokens: tokenSummary,
      models,
      dailyChart,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
