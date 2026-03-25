"use client";

import { useState, useMemo } from "react";
import { useFetch } from "@/lib/hooks";
import type { FocusItem } from "@/lib/services/weekly-focus";
import type { InboxItem } from "@/lib/services/inbox";
import type { Task } from "@/lib/types";
import {
  ClipboardCheck,
  CheckCircle2,
  Circle,
  Target,
  Inbox,
  ListTodo,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Pause,
  XCircle,
} from "lucide-react";

// --- Types ---

interface FocusWeek {
  id: string;
  weekStartDate: string;
  archived: boolean;
}

interface WeeklyFocusData {
  week: FocusWeek;
  items: FocusItem[];
}

// --- Helpers ---

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const mo = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endMo = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${mo} – ${endMo}`;
}

function isInWeek(dateStr: string, weekStart: Date, weekEnd: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= weekStart && d <= weekEnd;
}

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

// --- Section Components ---

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-5 ${className || ""}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  iconColor,
  title,
  count,
  badge,
}: {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  count?: number;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-4 h-4 ${iconColor || "text-[var(--md-text-tertiary)]"}`} />
      <h2 className="text-sm font-semibold text-[var(--md-text-primary)]">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto text-xs text-[var(--md-text-tertiary)]">{count}</span>
      )}
      {badge}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-[var(--md-text-tertiary)] italic">{text}</p>;
}

// --- Focus Items Section ---

const FOCUS_STATUS_CONFIG = {
  done: { label: "Done", icon: CheckCircle2, color: "text-[var(--md-success)]" },
  active: { label: "Active", icon: Circle, color: "text-violet-500" },
  deferred: { label: "Deferred", icon: Pause, color: "text-[var(--md-warning)]" },
  dropped: { label: "Dropped", icon: XCircle, color: "text-[var(--md-text-disabled)]" },
} as const;

function FocusSection({ items }: { items: FocusItem[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, FocusItem[]> = {
      done: [],
      active: [],
      deferred: [],
      dropped: [],
    };
    for (const item of items) {
      (groups[item.status] || groups.active).push(item);
    }
    return groups;
  }, [items]);

  const total = items.length;
  const doneCount = grouped.done.length;

  return (
    <SectionCard>
      <SectionHeader
        icon={Target}
        iconColor="text-violet-500"
        title="Weekly Focus"
        badge={
          total > 0 ? (
            <span className="ml-auto text-xs text-[var(--md-text-tertiary)]">
              {doneCount}/{total} done
            </span>
          ) : undefined
        }
      />
      {total === 0 ? (
        <EmptyState text="No focus items this week" />
      ) : (
        <div className="space-y-3">
          {(["done", "active", "deferred", "dropped"] as const).map((status) => {
            const group = grouped[status];
            if (group.length === 0) return null;
            const config = FOCUS_STATUS_CONFIG[status];
            const StatusIcon = config.icon;
            return (
              <div key={status}>
                <p className="text-xs font-medium text-[var(--md-text-tertiary)] uppercase tracking-wider mb-1.5">
                  {config.label} ({group.length})
                </p>
                <div className="space-y-1">
                  {group.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 px-2 py-1.5">
                      <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                      <span
                        className={`text-sm ${
                          status === "done"
                            ? "text-[var(--md-text-body)] line-through opacity-60"
                            : status === "dropped"
                              ? "text-[var(--md-text-disabled)] line-through"
                              : "text-[var(--md-text-body)]"
                        }`}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// --- Tasks Sections ---

function TaskList({
  tasks,
  emptyText,
  done,
}: {
  tasks: Task[];
  emptyText: string;
  done?: boolean;
}) {
  if (tasks.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start gap-2 px-2 py-1.5">
          {done ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[var(--md-success)]" />
          ) : (
            <Circle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--md-text-tertiary)]" />
          )}
          <span
            className={`text-sm ${
              done
                ? "text-[var(--md-text-body)] line-through opacity-60"
                : "text-[var(--md-text-body)]"
            }`}
          >
            {task.fields.Name}
          </span>
          {task.fields.Priority === "urgent" && (
            <span className="ml-auto text-xs text-[var(--md-error)] font-medium">urgent</span>
          )}
          {task.fields.Priority === "high" && !done && (
            <span className="ml-auto text-xs text-[var(--md-warning)] font-medium">high</span>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Daily Notes Section ---

function DailyNotesSection({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!content?.trim()) {
    return (
      <SectionCard>
        <SectionHeader icon={FileText} title="Notes" />
        <EmptyState text="No notes this week" />
      </SectionCard>
    );
  }

  const preview = content.slice(0, 200);
  const isLong = content.length > 200;

  return (
    <SectionCard>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-4 w-full text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--md-text-tertiary)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--md-text-tertiary)]" />
        )}
        <h2 className="text-sm font-semibold text-[var(--md-text-primary)]">Notes</h2>
      </button>
      <div className="px-2">
        {expanded ? (
          <pre className="text-sm text-[var(--md-text-body)] whitespace-pre-wrap font-[inherit] leading-relaxed">
            {content}
          </pre>
        ) : (
          <p className="text-sm text-[var(--md-text-secondary)] leading-relaxed">
            {preview}
            {isLong && "..."}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

// --- Staleness Indicators ---

interface StalenessAlert {
  label: string;
  detail: string;
  severity: "warning" | "error";
}

function StalenessSection({ alerts }: { alerts: StalenessAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <SectionCard>
      <SectionHeader
        icon={AlertTriangle}
        iconColor="text-[var(--md-warning)]"
        title="Attention Needed"
        count={alerts.length}
      />
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2 rounded-lg ${
              alert.severity === "error"
                ? "bg-[var(--md-error)]/10"
                : "bg-[var(--md-warning)]/10"
            }`}
          >
            <Clock
              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                alert.severity === "error"
                  ? "text-[var(--md-error)]"
                  : "text-[var(--md-warning)]"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-[var(--md-text-primary)]">{alert.label}</p>
              <p className="text-xs text-[var(--md-text-tertiary)]">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// --- Main Review View ---

export function ReviewView() {
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  // Fetch all weeks for dropdown
  const { data: weeks, loading: weeksLoading } = useFetch<FocusWeek[]>(
    "/api/weekly-focus/weeks"
  );

  // Fetch focus items for selected week (or current)
  const focusUrl = selectedWeekId
    ? `/api/weekly-focus?weekId=${selectedWeekId}`
    : "/api/weekly-focus";
  const { data: focusData, loading: focusLoading } = useFetch<WeeklyFocusData>(focusUrl);

  // Fetch all tasks (done and open)
  const { data: allTasks, loading: tasksLoading } = useFetch<Task[]>("/api/tasks?status=all");

  // Fetch unprocessed inbox for staleness
  const { data: unprocessedInbox } = useFetch<InboxItem[]>("/api/inbox?processed=false");

  // Fetch daily notes
  const { data: dailyNote } = useFetch<{ content: string }>("/api/daily-notes");

  // Derive week boundaries
  const weekStart = useMemo(() => {
    if (!focusData?.week?.weekStartDate) return getMonday(new Date());
    return new Date(focusData.week.weekStartDate + "T00:00:00");
  }, [focusData?.week?.weekStartDate]);

  const weekEnd = useMemo(() => getSunday(weekStart), [weekStart]);

  // Filter tasks into completed-this-week and open-from-this-week
  const { completedTasks, openTasks } = useMemo(() => {
    if (!allTasks) return { completedTasks: [], openTasks: [] };

    const completed = allTasks.filter((t) => {
      if (t.fields.Status !== "done") return false;
      // Check CompletedAt first, fall back to CreatedAt
      const dateField = t.fields.CompletedAt || t.fields.CreatedAt;
      return isInWeek(dateField, weekStart, weekEnd);
    });

    const open = allTasks.filter((t) => {
      if (t.fields.Status === "done" || t.fields.Status === "archived") return false;
      return isInWeek(t.fields.CreatedAt, weekStart, weekEnd);
    });

    return { completedTasks: completed, openTasks: open };
  }, [allTasks, weekStart, weekEnd]);

  // Staleness alerts
  const stalenessAlerts = useMemo(() => {
    const alerts: StalenessAlert[] = [];

    if (unprocessedInbox && unprocessedInbox.length > 0) {
      const staleItems = unprocessedInbox.filter((i) => hoursAgo(i.createdAt) > 24);
      if (staleItems.length > 0) {
        const oldest = Math.max(...staleItems.map((i) => hoursAgo(i.createdAt)));
        const days = Math.floor(oldest / 24);
        alerts.push({
          label: `${staleItems.length} unprocessed inbox item${staleItems.length > 1 ? "s" : ""} > 24h`,
          detail: `Oldest: ${days}d ago. Process or discard to keep inbox clean.`,
          severity: days > 3 ? "error" : "warning",
        });
      }

      if (unprocessedInbox.length >= 10) {
        alerts.push({
          label: `${unprocessedInbox.length} items in inbox`,
          detail: "Inbox is piling up. Schedule a clarify session.",
          severity: unprocessedInbox.length >= 20 ? "error" : "warning",
        });
      }
    }

    // Open tasks from earlier this week with no progress
    const urgentOpen = openTasks.filter((t) => t.fields.Priority === "urgent");
    if (urgentOpen.length > 0) {
      alerts.push({
        label: `${urgentOpen.length} urgent task${urgentOpen.length > 1 ? "s" : ""} still open`,
        detail: urgentOpen.map((t) => t.fields.Name).join(", "),
        severity: "error",
      });
    }

    return alerts;
  }, [unprocessedInbox, openTasks]);

  // Loading state
  const loading = weeksLoading || focusLoading || tasksLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-[var(--md-surface)] rounded-lg animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[var(--md-surface)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const weekLabel = focusData?.week?.weekStartDate
    ? formatWeekLabel(focusData.week.weekStartDate)
    : "This Week";

  const isCurrentWeek = !selectedWeekId || selectedWeekId === focusData?.week?.id;

  return (
    <div className="space-y-6">
      {/* Header + Week Selector */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--md-text-primary)] tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-violet-500" />
            Review
          </h1>
          <p className="text-sm text-[var(--md-text-tertiary)] mt-1">{weekLabel}</p>
        </div>

        {weeks && weeks.length > 1 && (
          <select
            value={selectedWeekId || ""}
            onChange={(e) => setSelectedWeekId(e.target.value || null)}
            className="text-sm bg-[var(--md-surface)] text-[var(--md-text-primary)] border border-[var(--md-border)] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="">Current week</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                Week of{" "}
                {new Date(w.weekStartDate + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Staleness Alerts (current week only) */}
      {isCurrentWeek && <StalenessSection alerts={stalenessAlerts} />}

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Focus done",
            value: `${focusData?.items?.filter((i) => i.status === "done").length || 0}/${focusData?.items?.length || 0}`,
            color: "text-violet-500",
          },
          {
            label: "Tasks done",
            value: String(completedTasks.length),
            color: "text-[var(--md-success)]",
          },
          {
            label: "Tasks open",
            value: String(openTasks.length),
            color: openTasks.length > 0 ? "text-[var(--md-warning)]" : "text-[var(--md-text-tertiary)]",
          },
          {
            label: "Inbox pending",
            value: String(unprocessedInbox?.length || 0),
            color: (unprocessedInbox?.length || 0) > 5 ? "text-[var(--md-warning)]" : "text-[var(--md-text-tertiary)]",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-[var(--md-border)] bg-[var(--card)] px-4 py-3 text-center"
          >
            <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-[var(--md-text-tertiary)] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly Focus Items */}
      <FocusSection items={focusData?.items || []} />

      {/* Completed Tasks */}
      <SectionCard>
        <SectionHeader
          icon={CheckCircle2}
          iconColor="text-[var(--md-success)]"
          title="Completed Tasks"
          count={completedTasks.length}
        />
        <TaskList tasks={completedTasks} emptyText="No tasks completed this week" done />
      </SectionCard>

      {/* Open Tasks */}
      <SectionCard>
        <SectionHeader
          icon={ListTodo}
          title="Still Open"
          count={openTasks.length}
        />
        <TaskList tasks={openTasks} emptyText="No open tasks from this week" />
      </SectionCard>

      {/* Daily Notes (collapsible) */}
      <DailyNotesSection content={dailyNote?.content || ""} />
    </div>
  );
}
