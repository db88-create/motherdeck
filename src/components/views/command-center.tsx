"use client";

import { useFetch } from "@/lib/hooks";
import { CronJob, Session, Gateway, Alert } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Server,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Cpu,
} from "lucide-react";

interface CommandData {
  cronJobs: CronJob[];
  sessions: Session[];
  gateway: Gateway | null;
  alerts: Alert[];
  todaySpend: number;
  dailyBudget: number;
}

export function CommandCenter() {
  const { data, loading } = useFetch<CommandData>(
    "/api/command-center",
    60000
  );

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  const spendPct = Math.min((data.todaySpend / data.dailyBudget) * 100, 100);
  const gw = data.gateway?.fields;

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold text-[#0a0a0a]">Command Center</h1>

      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#a3a3a3]" />
                <span className="text-sm text-[#737373]">Gateway</span>
              </div>
              <Badge
                variant={gw?.Status === "online" ? "default" : "destructive"}
                className={
                  gw?.Status === "online"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : ""
                }
              >
                {gw?.Status || "unknown"}
              </Badge>
            </div>
            {gw && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-[#a3a3a3]">
                  Uptime: {gw.Uptime}
                </p>
                <p className="text-xs text-[#a3a3a3]">
                  Memory: {gw.MemoryMB} MB
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[#a3a3a3]" />
              <span className="text-sm text-[#737373]">Today&apos;s Spend</span>
            </div>
            <p className="text-2xl font-semibold text-[#0a0a0a]">
              ${data.todaySpend.toFixed(2)}
            </p>
            <Progress value={spendPct} className="mt-2 h-2" />
            <p className="text-xs text-[#a3a3a3] mt-1">
              ${data.dailyBudget.toFixed(2)} daily budget
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-[#a3a3a3]" />
              <span className="text-sm text-[#737373]">Active Sessions</span>
            </div>
            <p className="text-2xl font-semibold text-[#0a0a0a]">
              {data.sessions.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#a3a3a3]" />
              <span className="text-sm text-[#737373]">Active Alerts</span>
            </div>
            <p className="text-2xl font-semibold text-[#0a0a0a]">
              {data.alerts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      {data.sessions.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-[#0a0a0a] text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" /> Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5]"
              >
                <div>
                  <p className="text-sm font-medium text-[#404040]">
                    {s.fields.Name}
                  </p>
                  <p className="text-xs text-[#a3a3a3]">
                    {s.fields.Type} &middot; {s.fields.Model}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <Progress value={s.fields.ContextPct} className="h-2" />
                    <p className="text-xs text-[#a3a3a3] mt-0.5 text-right">
                      {s.fields.ContextPct}% ctx
                    </p>
                  </div>
                  <p className="text-xs text-[#737373] tabular-nums">
                    ${s.fields.Cost?.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cron Jobs */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-[#0a0a0a] text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" /> Cron Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.cronJobs.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-lg bg-[#fafafa] border border-[#e5e5e5]"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#404040] truncate">
                    {job.fields.Name}
                  </p>
                  {job.fields.LastResult === "success" ? (
                    <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0" />
                  ) : job.fields.LastResult === "error" ? (
                    <XCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
                  ) : null}
                </div>
                <p className="text-xs text-[#a3a3a3] font-mono">
                  {job.fields.Schedule}
                </p>
                {job.fields.LastRun && (
                  <p className="text-xs text-[#a3a3a3] mt-1">
                    Last: {new Date(job.fields.LastRun).toLocaleString()}
                  </p>
                )}
                {job.fields.ConsecutiveErrors > 0 && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    {job.fields.ConsecutiveErrors} errors
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-[#0a0a0a] text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.fields.Severity === "critical"
                    ? "bg-red-50 border-red-200"
                    : alert.fields.Severity === "warning"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <p className="text-sm font-medium text-[#404040]">
                  {alert.fields.Title}
                </p>
                <p className="text-xs text-[#737373] mt-1">
                  {alert.fields.Message}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="h-8 w-48 bg-[#f5f5f5] rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 bg-[#fafafa] border border-[#e5e5e5] rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="h-48 bg-[#fafafa] border border-[#e5e5e5] rounded-xl animate-pulse" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Server className="w-12 h-12 text-[#d4d4d4] mx-auto mb-3" />
        <p className="text-[#737373]">
          Connect Airtable to see your command center
        </p>
        <p className="text-xs text-[#a3a3a3] mt-1">
          Add AIRTABLE_PAT and AIRTABLE_BASE_ID to .env.local
        </p>
      </div>
    </div>
  );
}
