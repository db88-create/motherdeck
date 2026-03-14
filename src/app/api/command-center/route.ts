import { NextResponse } from "next/server";
import { fetchAll } from "@/lib/airtable";
import {
  CronJobFields,
  SessionFields,
  GatewayFields,
  AlertFields,
  UsageMetricFields,
} from "@/lib/types";

export async function GET() {
  try {
    const [cronJobs, sessions, gateway, alerts, usage] = await Promise.all([
      fetchAll<CronJobFields>("CronJobs", {
        sort: [{ field: "Name", direction: "asc" }],
      }),
      fetchAll<SessionFields>("Sessions", {
        filterByFormula: "{Active} = TRUE()",
      }),
      fetchAll<GatewayFields>("Gateway", { maxRecords: 1 }),
      fetchAll<AlertFields>("Alerts", {
        filterByFormula: "{Acknowledged} = FALSE()",
        sort: [{ field: "CreatedAt", direction: "desc" }],
        maxRecords: 10,
      }),
      fetchAll<UsageMetricFields>("UsageMetrics", {
        filterByFormula: `{Date} = '${new Date().toISOString().split("T")[0]}'`,
      }),
    ]);

    // Calculate today's spend
    const todaySpend = usage.reduce((sum, r) => sum + (r.fields.Cost || 0), 0);

    return NextResponse.json({
      cronJobs,
      sessions,
      gateway: gateway[0] || null,
      alerts,
      todaySpend,
      dailyBudget: 5,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
