"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, AlertTriangle, Clock, Radio, CheckCircle2 } from "lucide-react";
import { MCProxyService, MCTask } from "@/lib/services/mission-control";
import { cn } from "@/lib/utils";

export function StrategicPulseStrip() {
  const [blockers, setBlockers] = useState<MCTask[]>([]);
  const [deadlines, setDeadlines] = useState<MCTask[]>([]);
  const [mcDown, setMcDown] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [b, d] = await Promise.all([
        MCProxyService.getBlockedWorkstreams(),
        MCProxyService.getUpcomingDeadlines(7),
      ]);
      setBlockers(b);
      setDeadlines(d);
      setMcDown(false);
    } catch (err: any) {
      if (err.mcDown) setMcDown(true);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!loaded) return null;

  if (mcDown) {
    return (
      <div className="rounded-lg border border-[var(--md-border)] bg-[var(--card)] px-4 py-2.5 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-[var(--md-text-disabled)]" />
        <span className="text-xs text-[var(--md-text-disabled)] italic">
          MC unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--md-border)] bg-[var(--card)] px-4 py-2.5 flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-[var(--md-text-tertiary)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--md-text-tertiary)]">
          Pulse
        </span>
      </div>

      {/* Blockers */}
      <div className="flex items-center gap-1.5">
        <AlertTriangle
          className={cn(
            "w-3.5 h-3.5",
            blockers.length > 0 ? "text-[var(--md-error)]" : "text-[var(--md-text-disabled)]"
          )}
        />
        <span
          className={cn(
            "text-xs font-medium",
            blockers.length > 0
              ? "text-[var(--md-error)]"
              : "text-[var(--md-text-tertiary)]"
          )}
        >
          {blockers.length} blocker{blockers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Deadlines */}
      <div className="flex items-center gap-1.5">
        <Clock
          className={cn(
            "w-3.5 h-3.5",
            deadlines.length > 0
              ? "text-[var(--md-warning)]"
              : "text-[var(--md-text-disabled)]"
          )}
        />
        <span
          className={cn(
            "text-xs font-medium",
            deadlines.length > 0
              ? "text-[var(--md-warning)]"
              : "text-[var(--md-text-tertiary)]"
          )}
        >
          {deadlines.length} deadline{deadlines.length !== 1 ? "s" : ""} this week
        </span>
      </div>

      {/* Network placeholder */}
      <div className="flex items-center gap-1.5">
        <Radio className="w-3.5 h-3.5 text-[var(--md-success)]" />
        <span className="text-xs text-[var(--md-text-tertiary)]">Network OK</span>
      </div>
    </div>
  );
}
