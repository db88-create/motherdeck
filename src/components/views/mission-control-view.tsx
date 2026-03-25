"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Clock,
  Circle,
  Wifi,
  WifiOff,
} from "lucide-react";

// ─── Types (from mission-control-web.py /api/data) ───

interface MCIssue {
  identifier: string;
  title: string;
  state: { name: string; type: string };
  priority: number;
  priorityLabel: string;
  labels: { nodes: { name: string }[] };
  project: { name: string } | null;
  parent: { identifier: string } | null;
  children: { nodes: MCIssue[] };
  dueDate: string | null;
  updatedAt: string;
}

interface MCProject {
  name: string;
  state: string;
  progress: number; // 0-1
  targetDate: string | null;
  startDate: string | null;
}

interface MCNetwork {
  dmas: {
    market: string;
    market_name: string;
    total: number;
    online: number;
    offline: number;
    health_pct: number;
    offline_devices: { name: string; last_seen: string }[];
  }[];
  totals: { total: number; online: number; offline: number; health_pct: number };
  offline_devices?: { name: string; market: string; last_seen: string }[];
  error?: string;
}

interface MCConfig {
  orgs: Record<string, {
    label: string;
    showNetwork: boolean;
    pillars: Record<string, { label: string; css: string; projects: string[] }>;
  }>;
  projectGroups?: Record<string, { sub: string[]; names: Record<string, string> }>;
}

interface MCData {
  issues: MCIssue[];
  projects: MCProject[];
  network: MCNetwork;
  updated: string | null;
  config: MCConfig;
}

// ─── Derived UI types ───

interface ProjectView {
  name: string;
  progress: number; // 0-100
  targetDate: string | null;
  issues: IssueView[];
  thisWeekIssues: IssueView[];
  blockerCount: number;
}

interface IssueView {
  id: string;
  title: string;
  state: string;
  stateType: string;
  priority: string;
  isThisWeek: boolean;
  isBlocker: boolean;
  dueDate: string | null;
}

interface PillarView {
  id: string;
  label: string;
  projects: ProjectView[];
}

// ─── Data Mapping ───

function mapIssue(issue: MCIssue): IssueView {
  const labels = issue.labels?.nodes?.map(l => l.name) || [];
  return {
    id: issue.identifier,
    title: issue.title,
    state: issue.state.name,
    stateType: issue.state.type,
    priority: issue.priorityLabel || "No priority",
    isThisWeek: labels.includes("this-week"),
    isBlocker: labels.includes("blocker"),
    dueDate: issue.dueDate,
  };
}

function buildPillars(data: MCData, orgKey: string): PillarView[] {
  const org = data.config.orgs[orgKey];
  if (!org) return [];

  const projectGroups = data.config.projectGroups || {};

  return Object.entries(org.pillars).map(([pillarId, pillarCfg]) => {
    const projects: ProjectView[] = pillarCfg.projects.map(projName => {
      // Find Linear project data
      const linearProj = data.projects.find(p => p.name === projName);

      // Find all issues for this project (including sub-projects from groups)
      const groupNames = projectGroups[projName]?.sub || [projName];
      const issues = data.issues
        .filter(i => i.project && groupNames.includes(i.project.name))
        .filter(i => !i.parent) // Only top-level issues
        .map(mapIssue);

      const thisWeekIssues = issues.filter(i => i.isThisWeek);
      const blockerCount = issues.filter(i => i.isBlocker && i.stateType !== "completed" && i.stateType !== "canceled").length;

      return {
        name: projName,
        progress: linearProj ? Math.round(linearProj.progress * 100) : 0,
        targetDate: linearProj?.targetDate || null,
        issues,
        thisWeekIssues,
        blockerCount,
      };
    });

    return {
      id: pillarId,
      label: pillarCfg.label,
      projects,
    };
  });
}

// ─── Progress Colors ───

function progressColor(pct: number): string {
  if (pct >= 100) return "bg-emerald-600";
  if (pct >= 67) return "bg-emerald-500";
  if (pct >= 34) return "bg-amber-500";
  return "bg-zinc-600";
}

function progressBg(pct: number): string {
  if (pct >= 100) return "bg-emerald-950/40";
  if (pct >= 67) return "bg-emerald-950/30";
  if (pct >= 34) return "bg-amber-950/30";
  return "bg-zinc-950/30";
}

function progressTextColor(pct: number): string {
  if (pct >= 100) return "text-emerald-400";
  if (pct >= 67) return "text-emerald-400";
  if (pct >= 34) return "text-amber-400";
  return "text-zinc-400";
}

// ─── Issue Status Icon ───

function IssueIcon({ stateType, state }: { stateType: string; state: string }) {
  if (stateType === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (stateType === "started") return <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />;
  if (stateType === "canceled") return <Circle className="w-4 h-4 text-zinc-600 shrink-0 line-through" />;
  if (state === "Blocked") return <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />;
  return <Circle className="w-4 h-4 text-[var(--md-text-disabled)] shrink-0" />;
}

function priorityColor(priority: string): string {
  if (priority === "Urgent") return "text-red-500";
  if (priority === "High") return "text-orange-400";
  if (priority === "Medium") return "text-amber-400";
  return "text-zinc-500";
}

// ─── Project Card ───

function ProjectCard({ project }: { project: ProjectView }) {
  const [expanded, setExpanded] = useState(false);

  const activeIssues = project.issues.filter(i => i.stateType !== "completed" && i.stateType !== "canceled");
  const doneIssues = project.issues.filter(i => i.stateType === "completed");

  return (
    <div
      className={cn(
        "rounded-2xl border-2 transition-all duration-200 cursor-pointer",
        "bg-[var(--md-bg-alt)] hover:bg-[var(--md-surface)]",
        project.blockerCount > 0
          ? "border-red-500/50"
          : "border-[var(--md-border)]"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[22px] font-bold text-[var(--md-text-primary)] leading-tight">
            {project.name}
          </h3>
          <div className="flex items-center gap-3">
            {project.thisWeekIssues.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 text-[13px] font-semibold border border-blue-500/30">
                {project.thisWeekIssues.length} this week
              </span>
            )}
            {project.blockerCount > 0 && (
              <span className="mc-pulse inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[16px] font-bold tabular-nums">
                <AlertTriangle className="w-4 h-4" />
                {project.blockerCount}
              </span>
            )}
            {expanded ? (
              <ChevronDown className="w-6 h-6 text-[var(--md-text-tertiary)]" />
            ) : (
              <ChevronRight className="w-6 h-6 text-[var(--md-text-tertiary)]" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={cn("w-full h-4 rounded-full overflow-hidden", progressBg(project.progress))}>
          <div
            className={cn("h-full rounded-full transition-all duration-500", progressColor(project.progress))}
            style={{ width: `${Math.min(project.progress, 100)}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between mt-2">
          <span className={cn("text-[18px] font-bold tabular-nums", progressTextColor(project.progress))}>
            {project.progress}%
            <span className="text-[13px] text-[var(--md-text-tertiary)] font-normal ml-2">
              ({doneIssues.length}/{project.issues.length} issues)
            </span>
          </span>
          {project.targetDate && (
            <span className="text-[14px] text-[var(--md-text-secondary)]">
              Target: {project.targetDate}
            </span>
          )}
        </div>
      </div>

      {/* Expanded: This Week issues first, then all active */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-5 pb-5 pt-1 border-t border-[var(--md-border)] space-y-1">
          {/* This Week section */}
          {project.thisWeekIssues.length > 0 && (
            <>
              <div className="text-[12px] font-bold text-blue-400 uppercase tracking-wider pt-2 pb-1">
                This Week
              </div>
              {project.thisWeekIssues.map(issue => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
              {activeIssues.filter(i => !i.isThisWeek).length > 0 && (
                <div className="text-[12px] font-bold text-[var(--md-text-tertiary)] uppercase tracking-wider pt-3 pb-1">
                  Backlog
                </div>
              )}
            </>
          )}

          {/* Remaining active issues */}
          {activeIssues.filter(i => !i.isThisWeek).map(issue => (
            <IssueRow key={issue.id} issue={issue} />
          ))}

          {/* Done issues (collapsed) */}
          {doneIssues.length > 0 && (
            <div className="text-[12px] text-[var(--md-text-disabled)] pt-2">
              {doneIssues.length} completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: IssueView }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl",
        issue.isBlocker ? "bg-red-950/20" : "bg-[var(--md-surface)]"
      )}
    >
      <IssueIcon stateType={issue.stateType} state={issue.state} />
      <span
        className={cn(
          "flex-1 text-[15px]",
          issue.stateType === "completed"
            ? "text-[var(--md-text-tertiary)] line-through"
            : issue.isBlocker
            ? "text-red-400 font-medium"
            : "text-[var(--md-text-body)]"
        )}
      >
        {issue.title}
      </span>
      <span className={cn("text-[11px] font-mono", priorityColor(issue.priority))}>
        {issue.id}
      </span>
      {issue.isBlocker && (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase">Blocker</span>
      )}
      {issue.dueDate && (
        <span className="text-[12px] text-[var(--md-text-tertiary)]">
          <Clock className="w-3 h-3 inline mr-1" />
          {new Date(issue.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  );
}

// ─── Pillar Section ───

function PillarSection({ pillar }: { pillar: PillarView }) {
  const totalBlockers = pillar.projects.reduce((s, p) => s + p.blockerCount, 0);
  const avgProgress = Math.round(
    pillar.projects.reduce((s, p) => s + p.progress, 0) / (pillar.projects.length || 1)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[28px] font-extrabold text-[var(--md-text-primary)] tracking-tight">
          {pillar.label}
        </h2>
        <div className="flex items-center gap-4">
          <span className={cn("text-[18px] font-bold tabular-nums", progressTextColor(avgProgress))}>
            {avgProgress}% avg
          </span>
          {totalBlockers > 0 && (
            <span className="mc-pulse inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[16px] font-bold">
              <AlertTriangle className="w-4 h-4" />
              {totalBlockers} blocker{totalBlockers !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-4">
        {pillar.projects.map(p => (
          <ProjectCard key={p.name} project={p} />
        ))}
      </div>
    </div>
  );
}

// ─── Network Health Panel ───

function NetworkHealth({ network }: { network: MCNetwork }) {
  const [showOffline, setShowOffline] = useState(false);

  if (network.error || !network.totals) {
    return (
      <div className="rounded-2xl border-2 border-[var(--md-border)] bg-[var(--md-bg-alt)] p-6">
        <h2 className="text-[24px] font-extrabold text-[var(--md-text-primary)] mb-3 tracking-tight">Network</h2>
        <p className="text-[14px] text-[var(--md-text-tertiary)]">Network data unavailable</p>
      </div>
    );
  }

  const { totals, dmas = [] } = network;
  const offlineDevices = network.offline_devices || [];

  return (
    <div className="rounded-2xl border-2 border-[var(--md-border)] bg-[var(--md-bg-alt)] p-6">
      <h2 className="text-[24px] font-extrabold text-[var(--md-text-primary)] mb-4 tracking-tight">
        Network
      </h2>

      {/* Big number */}
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-[48px] font-black text-emerald-400 tabular-nums leading-none">
            {totals.online}
          </span>
          <span className="text-[24px] font-medium text-[var(--md-text-tertiary)]">
            / {totals.total}
          </span>
        </div>
        <div className="text-[16px] font-semibold text-[var(--md-text-secondary)] mt-1">
          SCREENS LIVE
        </div>
      </div>

      {/* Health bar */}
      <div className="w-full h-4 rounded-full bg-emerald-950/30 overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${totals.health_pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[18px] font-bold text-emerald-400 tabular-nums">
          {totals.health_pct}% ONLINE
        </span>
        {totals.offline > 0 && (
          <button
            onClick={() => setShowOffline(!showOffline)}
            className="flex items-center gap-2 text-[14px] text-red-400 hover:text-red-300 transition-colors"
          >
            <WifiOff className="w-4 h-4" />
            {totals.offline} offline
          </button>
        )}
      </div>

      {/* Market breakdown */}
      <div className="space-y-2">
        {dmas.map(dma => (
          <div key={dma.market} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--md-surface)]">
            <span className="text-[14px] text-[var(--md-text-body)]">{dma.market_name}</span>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-[14px] font-bold tabular-nums",
                dma.health_pct === 100 ? "text-emerald-400" : dma.health_pct >= 90 ? "text-amber-400" : "text-red-400"
              )}>
                {dma.online}/{dma.total}
              </span>
              {dma.offline > 0 && (
                <span className="text-[12px] text-red-400">{dma.offline} down</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Offline device list */}
      {showOffline && offlineDevices.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--md-border)] space-y-1">
          <div className="text-[12px] font-bold text-red-400 uppercase tracking-wider mb-2">Offline Devices</div>
          {offlineDevices.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded bg-red-950/20 text-[12px]">
              <span className="text-red-300 font-mono">{d.name}</span>
              {d.last_seen && (
                <span className="text-[var(--md-text-disabled)]">
                  Last: {new Date(d.last_seen).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alerts Panel ───

function AlertsPanel({ pillars, data }: { pillars: PillarView[]; data: MCData }) {
  const allBlockers: { project: string; issue: IssueView }[] = [];
  for (const pillar of pillars) {
    for (const project of pillar.projects) {
      for (const issue of project.issues) {
        if (issue.isBlocker && issue.stateType !== "completed" && issue.stateType !== "canceled") {
          allBlockers.push({ project: project.name, issue });
        }
      }
    }
  }

  // This week summary
  const thisWeekTotal = data.issues.filter(i =>
    i.labels?.nodes?.some(l => l.name === "this-week")
  ).length;
  const thisWeekDone = data.issues.filter(i =>
    i.labels?.nodes?.some(l => l.name === "this-week") && i.state.type === "completed"
  ).length;

  return (
    <div className="rounded-2xl border-2 border-[var(--md-border)] bg-[var(--md-bg-alt)] p-6">
      <h2 className="text-[24px] font-extrabold text-[var(--md-text-primary)] mb-4 tracking-tight">
        Alerts & Status
      </h2>

      {/* This Week summary */}
      {thisWeekTotal > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-950/20 border border-blue-500/20 mb-3">
          <span className="text-[24px] font-black text-blue-400 tabular-nums">{thisWeekDone}/{thisWeekTotal}</span>
          <span className="text-[14px] text-blue-300">this-week issues done</span>
        </div>
      )}

      {allBlockers.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          <span className="text-[18px] font-semibold text-emerald-400">No blockers</span>
        </div>
      ) : (
        <div className="space-y-2">
          {allBlockers.map((b, i) => (
            <div
              key={i}
              className="mc-pulse flex items-start gap-3 px-4 py-3 rounded-xl bg-red-950/20 border border-red-500/30"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-red-400">
                  {b.project}: {b.issue.title}
                </div>
                <div className="text-[12px] text-red-400/70 mt-0.5 font-mono">
                  {b.issue.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Org Tabs ───

function OrgTabs({ orgs, active, onChange }: {
  orgs: Record<string, { label: string }>;
  active: string;
  onChange: (org: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-[var(--md-surface)] rounded-lg p-1">
      {Object.entries(orgs).map(([key, cfg]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "px-4 py-2 rounded-md text-[14px] font-bold uppercase tracking-wider transition-all",
            active === key
              ? "bg-[var(--md-bg-alt)] text-[var(--md-text-primary)] shadow-sm"
              : "text-[var(--md-text-tertiary)] hover:text-[var(--md-text-secondary)]"
          )}
        >
          {cfg.label}
        </button>
      ))}
    </div>
  );
}

// ─── Mission Control View ───

export function MissionControlView() {
  const [data, setData] = useState<MCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState("primesight");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/mc/data");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.mc_down) {
          setError("Mission Control backend is offline");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const d: MCData = await res.json();
      setData(d);
    } catch {
      setError("Failed to load Mission Control data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 60 seconds (matches the Python MC refresh rate)
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mc-root min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mc-root min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-[18px] text-red-400">{error || "No data"}</p>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const pillars = buildPillars(data, activeOrg);
  const showNetwork = data.config.orgs[activeOrg]?.showNetwork ?? false;

  return (
    <div className="mc-root min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
          <h1 className="text-[36px] font-black text-[var(--md-text-primary)] tracking-tight">
            Mission Control
          </h1>
          <OrgTabs orgs={data.config.orgs} active={activeOrg} onChange={setActiveOrg} />
        </div>
        <div className="flex items-center gap-4">
          {data.updated && (
            <span className="text-[13px] text-[var(--md-text-tertiary)]">
              {new Date(data.updated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[12px] text-emerald-400 font-medium">LIVE</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="p-2 rounded-lg hover:bg-[var(--md-surface)] transition-colors text-[var(--md-text-tertiary)] hover:text-[var(--md-text-primary)]"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 px-5 py-3 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-[14px] text-red-400">{error}</span>
        </div>
      )}

      {/* Main layout */}
      <div className={cn(
        "grid gap-8",
        showNetwork ? "grid-cols-1 xl:grid-cols-[1fr_360px]" : "grid-cols-1 xl:grid-cols-[1fr_360px]"
      )}>
        {/* Left: Pillars */}
        <div className="space-y-10">
          {pillars.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[18px] text-[var(--md-text-tertiary)]">No projects with issues in this org</p>
            </div>
          )}
          {pillars.map(pillar => (
            <PillarSection key={pillar.id} pillar={pillar} />
          ))}
        </div>

        {/* Right: Network + Alerts */}
        <div className="space-y-6">
          {showNetwork && <NetworkHealth network={data.network} />}
          <AlertsPanel pillars={pillars} data={data} />
        </div>
      </div>
    </div>
  );
}
