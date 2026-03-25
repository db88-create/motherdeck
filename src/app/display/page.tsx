"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───

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
  progress: number;
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
  orgs: Record<
    string,
    {
      label: string;
      showNetwork: boolean;
      pillars: Record<string, { label: string; css: string; projects: string[] }>;
    }
  >;
  projectGroups?: Record<string, { sub: string[]; names: Record<string, string> }>;
}

interface MCData {
  issues: MCIssue[];
  projects: MCProject[];
  network: MCNetwork;
  updated: string | null;
  config: MCConfig;
}

// ─── Priority emoji ───

function priorityEmoji(p: number): string {
  if (p === 1) return "\u{1F534}";
  if (p === 2) return "\u{1F7E0}";
  if (p === 3) return "\u{1F7E1}";
  return "\u26AA";
}

// ─── State sort order ───

function stateSortOrder(stateType: string): number {
  if (stateType === "started") return 0;
  if (stateType === "unstarted") return 1;
  if (stateType === "completed") return 2;
  if (stateType === "canceled") return 3;
  return 1;
}

// ─── Progress helpers ───

function progressBarColor(pct: number): string {
  if (pct >= 100) return "#10b981";
  if (pct >= 67) return "#10b981";
  if (pct >= 34) return "#f59e0b";
  return "#3f3f46";
}

function progressTextClass(pct: number): string {
  if (pct >= 67) return "text-emerald-400";
  if (pct >= 34) return "text-amber-400";
  return "text-zinc-400";
}

// ─── State badge ───

function StateBadge({ stateType, state }: { stateType: string; state: string }) {
  if (stateType === "completed")
    return <span className="shrink-0 w-3 h-3 rounded-full bg-emerald-500" />;
  if (stateType === "started")
    return (
      <span className="shrink-0 w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
    );
  if (state === "Blocked")
    return <span className="shrink-0 w-3 h-3 rounded-full bg-red-500" />;
  return <span className="shrink-0 w-3 h-3 rounded-full border-2 border-zinc-600" />;
}

// ─── Network ring (SVG) ───

function HealthRing({ pct, size = 140 }: { pct: number; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 95 ? "#10b981" : pct >= 80 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} className="mx-auto">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1a1a2e"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2 - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-white font-black"
        style={{ fontSize: size * 0.25 }}
      >
        {pct}%
      </text>
      <text
        x={size / 2}
        y={size / 2 + 18}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-zinc-400 font-semibold uppercase"
        style={{ fontSize: size * 0.08, letterSpacing: "0.1em" }}
      >
        Online
      </text>
    </svg>
  );
}

// ─── Main Page ───

export default function DisplayPage() {
  const router = useRouter();
  const [data, setData] = useState<MCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrg, setActiveOrg] = useState("primesight");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [showOfflineDevices, setShowOfflineDevices] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/mc/data");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.mc_down) {
          setError("Mission Control backend offline");
          return;
        }
        throw new Error("Failed to fetch");
      }
      const d: MCData = await res.json();
      setData(d);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Derived data
  const org = data?.config?.orgs?.[activeOrg];
  const showNetwork = org?.showNetwork ?? false;
  const projectGroups = data?.config?.projectGroups || {};

  // Build pillars
  const pillars = useMemo(() => {
    if (!data || !org) return [];
    return Object.entries(org.pillars)
      .map(([pillarId, cfg]) => {
        const projects = cfg.projects
          .map((projName) => {
            const linearProj = data.projects.find((p) => p.name === projName);
            const groupNames = projectGroups[projName]?.sub || [projName];
            const issues = data.issues
              .filter((i) => i.project && groupNames.includes(i.project.name))
              .filter((i) => !i.parent);
            const progress = linearProj ? Math.round(linearProj.progress * 100) : 0;
            const active = issues.filter(
              (i) => i.state.type !== "completed" && i.state.type !== "canceled"
            );
            const done = issues.filter((i) => i.state.type === "completed");
            const blockers = active.filter((i) =>
              i.labels?.nodes?.some((l) => l.name === "blocker")
            );
            return {
              name: projName,
              progress,
              targetDate: linearProj?.targetDate || null,
              issues,
              activeCount: active.length,
              doneCount: done.length,
              totalCount: issues.length,
              blockerCount: blockers.length,
            };
          })
        return { id: pillarId, label: cfg.label, css: cfg.css, projects };
      });
  }, [data, org, projectGroups]);

  // This-week issues across the current org
  const thisWeekIssues = useMemo(() => {
    if (!data || !org) return [];
    // Collect all project names for the current org
    const orgProjectNames = new Set<string>();
    for (const pillar of Object.values(org.pillars)) {
      for (const pn of pillar.projects) {
        const group = projectGroups[pn]?.sub || [pn];
        group.forEach((n) => orgProjectNames.add(n));
      }
    }
    return data.issues
      .filter(
        (i) =>
          i.labels?.nodes?.some((l) => l.name === "this-week") &&
          i.project &&
          orgProjectNames.has(i.project.name) &&
          !i.parent
      )
      .sort((a, b) => stateSortOrder(a.state.type) - stateSortOrder(b.state.type));
  }, [data, org, projectGroups]);

  // All blockers for current org
  const allBlockers = useMemo(() => {
    if (!data || !org) return [];
    const orgProjectNames = new Set<string>();
    for (const pillar of Object.values(org.pillars)) {
      for (const pn of pillar.projects) {
        const group = projectGroups[pn]?.sub || [pn];
        group.forEach((n) => orgProjectNames.add(n));
      }
    }
    return data.issues.filter(
      (i) =>
        i.labels?.nodes?.some((l) => l.name === "blocker") &&
        i.state.type !== "completed" &&
        i.state.type !== "canceled" &&
        i.project &&
        orgProjectNames.has(i.project.name)
    );
  }, [data, org, projectGroups]);

  // ─── Loading / Error states ───

  if (loading && !data) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: "#06090f" }}
      >
        <div className="w-8 h-8 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="h-screen w-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#06090f", color: "#fafafa" }}
      >
        <div className="text-red-500 text-xl">{error || "No data"}</div>
        <button
          onClick={() => {
            setLoading(true);
            fetchData();
          }}
          className="px-6 py-2 rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const network = data.network;
  const offlineDevices = network?.offline_devices || [];

  return (
    <div
      className="mc-root h-screen w-screen overflow-hidden flex flex-col"
      style={{ background: "#06090f", color: "#e4e4e7" }}
    >
      {/* ─── Header ─── */}
      <header
        className="shrink-0 flex items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-6">
          <h1
            className="font-black tracking-tight uppercase"
            style={{ fontSize: "1.5rem", color: "#f4f4f5", letterSpacing: "0.08em" }}
          >
            Mission Control
          </h1>

          {/* Org tabs */}
          <div className="flex gap-1 rounded-lg p-1" style={{ background: "rgba(255,255,255,0.04)" }}>
            {Object.entries(data.config.orgs).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveOrg(key);
                  setExpandedProject(null);
                }}
                className="px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                style={{
                  background: activeOrg === key ? "rgba(255,255,255,0.08)" : "transparent",
                  color: activeOrg === key ? "#f4f4f5" : "#71717a",
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data.updated && (
            <span className="text-xs" style={{ color: "#52525b" }}>
              {new Date(data.updated).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Live
            </span>
          </div>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── Left (80% or 100%) ─── */}
        <div
          className="flex-1 overflow-y-auto p-5"
          style={{ flex: showNetwork ? "0 0 80%" : "1 1 100%" }}
        >
          {/* This Week strip */}
          {thisWeekIssues.length > 0 && (
            <section className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <h2
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: "#60a5fa" }}
                >
                  This Week
                </h2>
                <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded" style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                  {thisWeekIssues.filter((i) => i.state.type === "completed").length}/
                  {thisWeekIssues.length}
                </span>
              </div>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}
              >
                {thisWeekIssues.map((issue) => {
                  const labels = issue.labels?.nodes?.map((l) => l.name) || [];
                  const isBlocker = labels.includes("blocker");
                  return (
                    <div
                      key={issue.identifier}
                      className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                        isBlocker ? "mc-pulse" : ""
                      }`}
                      style={{
                        background:
                          issue.state.type === "completed"
                            ? "rgba(16,185,129,0.1)"
                            : isBlocker
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(255,255,255,0.04)",
                        border: isBlocker
                          ? "1px solid rgba(239,68,68,0.4)"
                          : "1px solid rgba(255,255,255,0.06)",
                        maxWidth: "320px",
                      }}
                    >
                      <StateBadge stateType={issue.state.type} state={issue.state.name} />
                      <span className="truncate" style={{ color: issue.state.type === "completed" ? "#6b7280" : "#d4d4d8" }}>
                        {priorityEmoji(issue.priority)} {issue.title}
                      </span>
                      <span className="shrink-0 font-mono" style={{ color: "#52525b" }}>
                        {issue.identifier}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pillar columns */}
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: `repeat(${pillars.length || 1}, 1fr)`,
            }}
          >
            {pillars.map((pillar) => (
              <div key={pillar.id} className="min-w-0">
                {/* Pillar header */}
                <div className="flex items-baseline justify-between mb-3">
                  <h2
                    className="text-base font-extrabold uppercase tracking-wider"
                    style={{ color: "#a1a1aa" }}
                  >
                    {pillar.label}
                  </h2>
                  {(() => {
                    const total = pillar.projects.reduce((s, p) => s + p.blockerCount, 0);
                    return total > 0 ? (
                      <span className="mc-pulse text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">
                        {total} blocker{total !== 1 ? "s" : ""}
                      </span>
                    ) : null;
                  })()}
                </div>

                {/* Project cards */}
                <div className="space-y-3">
                  {pillar.projects.map((project) => {
                    const isExpanded = expandedProject === `${pillar.id}::${project.name}`;
                    const projKey = `${pillar.id}::${project.name}`;
                    return (
                      <div
                        key={project.name}
                        className="rounded-xl cursor-pointer transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border:
                            project.blockerCount > 0
                              ? "1px solid rgba(239,68,68,0.4)"
                              : "1px solid rgba(255,255,255,0.06)",
                        }}
                        onClick={() =>
                          setExpandedProject(isExpanded ? null : projKey)
                        }
                      >
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h3
                              className="text-sm font-bold truncate"
                              style={{ color: "#e4e4e7" }}
                            >
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              {project.blockerCount > 0 && (
                                <span className="mc-pulse text-xs font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">
                                  {project.blockerCount}
                                </span>
                              )}
                              <span
                                className="text-xs"
                                style={{ color: "#71717a" }}
                              >
                                {isExpanded ? "\u25BC" : "\u25B6"}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div
                            className="w-full h-2 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.05)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(project.progress, 100)}%`,
                                background: progressBarColor(project.progress),
                              }}
                            />
                          </div>

                          <div className="flex items-baseline justify-between mt-1.5">
                            <span
                              className={`text-sm font-bold tabular-nums ${progressTextClass(
                                project.progress
                              )}`}
                            >
                              {project.progress}%
                            </span>
                            <span className="text-xs tabular-nums" style={{ color: "#52525b" }}>
                              {project.doneCount}/{project.totalCount} issues
                            </span>
                          </div>
                        </div>

                        {/* Expanded issues */}
                        {isExpanded && (
                          <div
                            className="px-3 pb-3 pt-1 space-y-1"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                          >
                            {project.issues
                              .filter(
                                (i) =>
                                  i.state.type !== "completed" &&
                                  i.state.type !== "canceled"
                              )
                              .sort(
                                (a, b) =>
                                  stateSortOrder(a.state.type) -
                                  stateSortOrder(b.state.type)
                              )
                              .map((issue) => {
                                const labels =
                                  issue.labels?.nodes?.map((l) => l.name) || [];
                                const isBlocker = labels.includes("blocker");
                                const hasChildren =
                                  issue.children?.nodes?.length > 0;
                                return (
                                  <div key={issue.identifier}>
                                    <div
                                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                                        isBlocker ? "mc-pulse" : ""
                                      }`}
                                      style={{
                                        background: isBlocker
                                          ? "rgba(239,68,68,0.1)"
                                          : "rgba(255,255,255,0.02)",
                                      }}
                                    >
                                      <StateBadge
                                        stateType={issue.state.type}
                                        state={issue.state.name}
                                      />
                                      <span
                                        className="flex-1 truncate"
                                        style={{
                                          color: isBlocker
                                            ? "#fca5a5"
                                            : "#a1a1aa",
                                        }}
                                      >
                                        {priorityEmoji(issue.priority)}{" "}
                                        {issue.title}
                                      </span>
                                      <span
                                        className="shrink-0 font-mono"
                                        style={{ color: "#3f3f46" }}
                                      >
                                        {issue.identifier}
                                      </span>
                                      {isBlocker && (
                                        <span className="shrink-0 px-1 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white uppercase">
                                          Blocker
                                        </span>
                                      )}
                                    </div>
                                    {/* Sub-task drill-down */}
                                    {hasChildren && (
                                      <div className="ml-5 mt-0.5 space-y-0.5">
                                        {issue.children.nodes.map((child) => (
                                          <div
                                            key={child.identifier}
                                            className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                                            style={{
                                              background:
                                                "rgba(255,255,255,0.01)",
                                            }}
                                          >
                                            <StateBadge
                                              stateType={child.state.type}
                                              state={child.state.name}
                                            />
                                            <span
                                              className="flex-1 truncate"
                                              style={{
                                                color:
                                                  child.state.type ===
                                                  "completed"
                                                    ? "#52525b"
                                                    : "#71717a",
                                                textDecoration:
                                                  child.state.type ===
                                                  "completed"
                                                    ? "line-through"
                                                    : "none",
                                              }}
                                            >
                                              {priorityEmoji(child.priority)}{" "}
                                              {child.title}
                                            </span>
                                            <span
                                              className="shrink-0 font-mono"
                                              style={{ color: "#27272a" }}
                                            >
                                              {child.identifier}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                            {/* Done count */}
                            {project.doneCount > 0 && (
                              <div
                                className="text-xs pt-1"
                                style={{ color: "#3f3f46" }}
                              >
                                {project.doneCount} completed
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Right panel (20%) ─── */}
        {showNetwork && (
          <div
            className="shrink-0 overflow-y-auto p-5 space-y-4"
            style={{
              width: "20%",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            {/* Network Health Ring */}
            {network && !network.error && network.totals ? (
              <>
                <div>
                  <h2
                    className="text-sm font-bold uppercase tracking-wider mb-3"
                    style={{ color: "#a1a1aa" }}
                  >
                    Network Health
                  </h2>
                  <HealthRing pct={network.totals.health_pct} size={140} />
                  <div className="text-center mt-2">
                    <span
                      className="text-lg font-black tabular-nums"
                      style={{ color: "#10b981" }}
                    >
                      {network.totals.online}
                    </span>
                    <span className="text-sm" style={{ color: "#52525b" }}>
                      {" "}
                      / {network.totals.total} screens
                    </span>
                  </div>
                </div>

                {/* Markets */}
                <div>
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-2"
                    style={{ color: "#71717a" }}
                  >
                    Markets
                  </h3>
                  <div className="space-y-1">
                    {network.dmas.map((dma) => (
                      <div
                        key={dma.market}
                        className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        <span style={{ color: "#a1a1aa" }}>{dma.market_name}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold tabular-nums"
                            style={{
                              color:
                                dma.health_pct === 100
                                  ? "#10b981"
                                  : dma.health_pct >= 90
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          >
                            {dma.online}/{dma.total}
                          </span>
                          {dma.offline > 0 && (
                            <span style={{ color: "#ef4444" }}>
                              {dma.offline} down
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Offline Devices */}
                {offlineDevices.length > 0 && (
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOfflineDevices(!showOfflineDevices);
                      }}
                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2"
                      style={{ color: "#ef4444" }}
                    >
                      <span>
                        {showOfflineDevices ? "\u25BC" : "\u25B6"} Offline
                        Devices ({offlineDevices.length})
                      </span>
                    </button>
                    {showOfflineDevices && (
                      <div className="space-y-1">
                        {offlineDevices.map((d, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-2 py-1 rounded text-xs"
                            style={{ background: "rgba(239,68,68,0.08)" }}
                          >
                            <span className="font-mono" style={{ color: "#fca5a5" }}>
                              {d.name}
                            </span>
                            {d.last_seen && (
                              <span style={{ color: "#3f3f46" }}>
                                {new Date(d.last_seen).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" }
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs" style={{ color: "#52525b" }}>
                Network data unavailable
              </div>
            )}

            {/* Blockers */}
            <div>
              <h2
                className="text-sm font-bold uppercase tracking-wider mb-2"
                style={{ color: allBlockers.length > 0 ? "#ef4444" : "#a1a1aa" }}
              >
                Blockers
              </h2>
              {allBlockers.length === 0 ? (
                <div
                  className="flex items-center gap-2 px-3 py-3 rounded-lg text-xs"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    color: "#10b981",
                  }}
                >
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  No blockers
                </div>
              ) : (
                <div className="space-y-1.5">
                  {allBlockers.map((issue) => (
                    <div
                      key={issue.identifier}
                      className="mc-pulse px-3 py-2 rounded-lg text-xs"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                      }}
                    >
                      <div className="font-semibold truncate" style={{ color: "#fca5a5" }}>
                        {issue.title}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono" style={{ color: "#52525b" }}>
                          {issue.identifier}
                        </span>
                        <span style={{ color: "#71717a" }}>
                          {issue.project?.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Floating nav button ─── */}
      <button
        onClick={() => router.push("/")}
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
        style={{
          background: "rgba(139,92,246,0.2)",
          border: "1px solid rgba(139,92,246,0.3)",
          color: "#a78bfa",
        }}
      >
        Command
      </button>
    </div>
  );
}
