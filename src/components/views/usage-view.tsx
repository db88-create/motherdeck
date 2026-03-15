"use client";

import { useFetch } from "@/lib/hooks";
import {
  CostSummary,
  TokenSummary,
  ModelBreakdown,
  DailyChartPoint,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface UsageData {
  costs: CostSummary;
  tokens: TokenSummary;
  models: ModelBreakdown[];
  dailyChart: DailyChartPoint[];
}

const PIE_COLORS = [
  "#8b5cf6",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export function UsageView() {
  const { data, loading } = useFetch<UsageData>("/api/usage", 300000);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { costs, tokens, models, dailyChart } = data;

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Usage & Costs</h1>

      {/* Cost cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <CostCard
          label="Today"
          value={costs.today}
          budget={costs.dailyBudget}
          icon={DollarSign}
        />
        <CostCard label="7 Day" value={costs.sevenDay} icon={TrendingUp} />
        <CostCard label="30 Day" value={costs.thirtyDay} icon={BarChart3} />
        <CostCard label="All Time" value={costs.allTime} icon={Zap} />
        <CostCard
          label="Projected/mo"
          value={costs.projectedMonthly}
          budget={costs.monthlyBudget}
          icon={TrendingUp}
          warn={costs.projectedMonthly > costs.monthlyBudget * 0.75}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-white border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">
              Daily Costs (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChart}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f3f4f6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => v.slice(5)}
                    stroke="#e5e7eb"
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
                    stroke="#e5e7eb"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#1f2937",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [
                      `$${Number(value).toFixed(4)}`,
                      "Cost",
                    ]}
                    labelFormatter={(label) => label}
                  />
                  <Bar
                    dataKey="cost"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 text-lg">
              Cost by Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={models}
                    dataKey="cost"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {models.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      color: "#1f2937",
                    }}
                    formatter={(value) => `$${Number(value).toFixed(4)}`}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value.replace("claude-", "").replace("anthropic/", "")
                    }
                    wrapperStyle={{ fontSize: "11px", color: "#6b7280" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token breakdown */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 text-lg">Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <TokenStat label="Input" value={tokens.input} />
            <TokenStat label="Output" value={tokens.output} />
            <TokenStat label="Cache Read" value={tokens.cacheRead} />
            <TokenStat label="Cache Write" value={tokens.cacheWrite} />
            <TokenStat label="Total" value={tokens.total} highlight />
          </div>
        </CardContent>
      </Card>

      {/* Model table */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 text-lg">
            Model Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs text-gray-500 font-medium p-3">
                  Model
                </th>
                <th className="text-right text-xs text-gray-500 font-medium p-3">
                  Calls
                </th>
                <th className="text-right text-xs text-gray-500 font-medium p-3">
                  Tokens
                </th>
                <th className="text-right text-xs text-gray-500 font-medium p-3">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="p-3 text-sm text-gray-800 font-mono">
                    {m.model.replace("anthropic/", "")}
                  </td>
                  <td className="p-3 text-sm text-gray-500 text-right tabular-nums">
                    {m.calls.toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-gray-500 text-right tabular-nums">
                    {formatTokens(m.tokens)}
                  </td>
                  <td className="p-3 text-sm text-gray-900 text-right tabular-nums font-medium">
                    ${m.cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function CostCard({
  label,
  value,
  budget,
  icon: Icon,
  warn,
}: {
  label: string;
  value: number;
  budget?: number;
  icon: any;
  warn?: boolean;
}) {
  const pct = budget ? (value / budget) * 100 : 0;
  return (
    <Card className="bg-white border-gray-200 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <p
          className={`text-xl font-bold tabular-nums ${
            warn ? "text-amber-500" : "text-gray-900"
          }`}
        >
          ${value.toFixed(2)}
        </p>
        {budget && (
          <p className="text-xs text-gray-400 mt-1">
            {pct.toFixed(0)}% of ${budget} budget
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TokenStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className={`text-lg font-bold tabular-nums ${
          highlight ? "text-violet-600" : "text-gray-900"
        }`}
      >
        {formatTokens(value)}
      </p>
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
