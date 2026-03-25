"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, AlertTriangle, Clock, Radio } from "lucide-react";
import { MCProxyService, MCTask } from "@/lib/services/mission-control";

const MAX_VISIBLE = 3;

export function StrategicPulse() {
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
      <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-[var(--md-text-tertiary)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">
            Strategic Pulse
          </h3>
        </div>
        <p className="text-sm text-[var(--md-text-disabled)] italic">MC unavailable</p>
      </div>
    );
  }

  const hasItems = blockers.length > 0 || deadlines.length > 0;

  return (
    <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-[var(--md-text-tertiary)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">
          Strategic Pulse
        </h3>
      </div>

      {!hasItems ? (
        <p className="text-sm text-[var(--md-text-tertiary)] italic">No urgent items</p>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {/* Blockers */}
          <Column
            icon={<AlertTriangle className="w-3.5 h-3.5 text-[var(--md-error)]" />}
            label="Blockers"
            items={blockers}
            colorVar="--md-error"
            renderItem={(t) => (
              <a
                href={`/mission-control?task=${t.id}`}
                className="text-xs text-[var(--md-text-body)] hover:text-[var(--md-error)] truncate block"
                title={t.title}
              >
                {t.title}
              </a>
            )}
          />

          {/* Deadlines */}
          <Column
            icon={<Clock className="w-3.5 h-3.5 text-[var(--md-warning)]" />}
            label="Deadlines"
            items={deadlines}
            colorVar="--md-warning"
            renderItem={(t) => {
              const due = t.dueDate ? new Date(t.dueDate) : null;
              const label = due
                ? `${due.getMonth() + 1}/${due.getDate()}`
                : "";
              return (
                <div className="text-xs text-[var(--md-text-body)] truncate" title={t.title}>
                  <span className="text-[var(--md-text-disabled)] mr-1">{label}</span>
                  {t.title}
                </div>
              );
            }}
          />

          {/* Network (placeholder for live network status) */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Radio className="w-3.5 h-3.5 text-[var(--md-success)]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--md-text-tertiary)]">
                Network
              </span>
            </div>
            <p className="text-xs text-[var(--md-text-disabled)] italic">Live data pending</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Column<T>({
  icon,
  label,
  items,
  colorVar,
  renderItem,
}: {
  icon: React.ReactNode;
  label: string;
  items: T[];
  colorVar: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - MAX_VISIBLE;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--md-text-tertiary)]">
          {label}
        </span>
        {items.length > 0 && (
          <span
            className="text-[10px] font-bold ml-auto"
            style={{ color: `var(${colorVar})` }}
          >
            {items.length}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {visible.length === 0 && (
          <p className="text-xs text-[var(--md-text-disabled)] italic">Clear</p>
        )}
        {visible.map((item, i) => (
          <div key={i}>{renderItem(item)}</div>
        ))}
        {overflow > 0 && (
          <p className="text-[10px] text-[var(--md-text-disabled)]">+{overflow} more</p>
        )}
      </div>
    </div>
  );
}
