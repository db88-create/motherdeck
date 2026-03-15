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
      <h1 className="text-2xl font-semibold text-[var(--md-text-primary)]">Command Center</h1>

      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[var(--md-bg)]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[var(--md-text-tertiary)]" />
                <span className="text-sm text-[var(--md-text-secondary)]">Gateway</span>
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
                <p className="text-xs text-[var(--md-text-tertiary)]">
                  Uptime: {gw.Uptime}
                </p>
                <p className="text-xs text-[var(--md-text-tertiary)]">
                  Memory: {gw.MemoryMB} MB
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[var(--md-bg)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-[var(--md-text-tertiary)]" />
              <span className="text-sm text-[var(--md-text-secondary)]">Today&apos;s Spend</span>
            </div>
            <p className="text-2xl font-semibold text-[var(--md-text-primary)]">
              ${data.todaySpend.toFixed(2)}
            </p>
            <Progress value={spendPct} className="mt-2 h-2" />
            <p className="text-xs text-[var(--md-text-tertiary)] mt-1">
              ${data.dailyBudget.toFixed(2)} daily budget
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--md-bg)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-[var(--md-text-tertiary)]" />
              <span className="text-sm text-[var(--md-text-secondary)]">Active Sessions</span>
            </div>
            <p className="text-2xl font-semibold text-[var(--md-text-primary)]">
              {data.sessions.length}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--md-bg)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[var(--md-text-tertiary)]" />
              <span className="text-sm text-[var(--md-text-secondary)]">Active Alerts</span>
            </div>
            <p className="text-2xl font-semibold text-[var(--md-text-primary)]">
              {data.alerts.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      {data.sessions.length > 0 && (
        <Card className="bg-[var(--md-bg)]">
          <CardHeader>
            <CardTitle className="text-[var(--md-text-primary)] text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" /> Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--md-bg-alt)] border border-[var(--md-border)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--md-text-body)]">
                    {s.fields.Name}
                  </p>
                  <p className="text-xs text-[var(--md-text-tertiary)]">
                    {s.fields.Type} &middot; {s.fields.Model}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <Progress value={s.fields.ContextPct} className="h-2" />
                    <p className="text-xs text-[var(--md-text-tertiary)] mt-0.5 text-right">
                      {s.fields.ContextPct}% ctx
                    </p>
                  </div>
                  <p className="text-xs text-[var(--md-text-secondary)] tabular-nums">
                    ${s.fields.Cost?.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cron Jobs */}
      <Card className="bg-[var(--md-bg)]">
        <CardHeader>
          <CardTitle className="text-[var(--md-text-primary)] text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" /> Cron Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.cronJobs.map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-lg bg-[var(--md-bg-alt)] border border-[var(--md-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[var(--md-text-body)] truncate">
                    {job.fields.Name}
                  </p>
                  {job.fields.LastResult === "success" ? (
                    <CheckCircle className="w-4 h-4 text-[var(--md-success)] shrink-0" />
                  ) : job.fields.LastResult === "error" ? (
                    <XCircle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
                  ) : null}
                </div>
                <p className="text-xs text-[var(--md-text-tertiary)] font-mono">
                  {job.fields.Schedule}
                </p>
                {job.fields.LastRun && (
                  <p className="text-xs text-[var(--md-text-tertiary)] mt-1">
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
        <Card className="bg-[var(--md-bg)]">
          <CardHeader>
            <CardTitle className="text-[var(--md-text-primary)] text-lg flex items-center gap-2">
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
                <p className="text-sm font-medium text-[var(--md-text-body)]">
                  {alert.fields.Title}
                </p>
                <p className="text-xs text-[var(--md-text-secondary)] mt-1">
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
      <div className="h-8 w-48 bg-[var(--md-surface)] rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 bg-[var(--md-bg-alt)] border border-[var(--md-border)] rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="h-48 bg-[var(--md-bg-alt)] border border-[var(--md-border)] rounded-xl animate-pulse" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Server className="w-12 h-12 text-[var(--md-text-disabled)] mx-auto mb-3" />
        <p className="text-[var(--md-text-secondary)]">
          Connect Airtable to see your command center
        </p>
        <p className="text-xs text-[var(--md-text-tertiary)] mt-1">
          Add AIRTABLE_PAT and AIRTABLE_BASE_ID to .env.local
        </p>
      </div>
    </div>
  );
}
