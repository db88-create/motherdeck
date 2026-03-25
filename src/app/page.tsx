"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav, TabId } from "@/components/nav";
import { useTaskStore } from "@/lib/tasks/useTaskStore";
import { TodayView } from "@/components/views/today-view";
import { MissionControlView } from "@/components/views/mission-control-view";
import { UsageView } from "@/components/views/usage-view";
import { IdeasExpensesView } from "@/components/views/ideas-expenses-view";
import { BriefsView } from "@/components/views/briefs-view";
import { ActionNotesView } from "@/components/views/action-notes-view";
import { ReviewView } from "@/components/views/review-view";
import { WeekView } from "@/components/views/week-view";
import { CalendarView } from "@/components/views/calendar-view";

export default function Home() {
  const [tab, setTab] = useState<TabId>("today");
  const store = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Handle PWA shortcut deep links via ?view= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") as TabId | null;
    if (view) setTab(view);
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--md-bg)]">
      <Nav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-8 md:px-8 md:py-8 lg:px-10 pb-24 md:pb-8 w-full">
        <div className={tab === "mission" ? "max-w-[1800px] mx-auto" : "max-w-[1400px] mx-auto"}>
          {tab === "today" && (
            <TodayView
              store={store}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
            />
          )}
          {tab === "week" && (
            <WeekView store={store} />
          )}
          {tab === "calendar" && (
            <CalendarView
              tasks={store.tasks}
              addTask={store.addTask}
              updateStatus={store.updateStatus}
              selectedTaskId={selectedTaskId}
              onSelectTask={(id) => {
                setSelectedTaskId(id);
                setTab("today");
              }}
            />
          )}
          {tab === "mission" && <MissionControlView />}
          {tab === "usage" && <UsageView />}
          {tab === "ideas" && <IdeasExpensesView />}
          {tab === "briefs" && <BriefsView />}
          {tab === "action-notes" && <ActionNotesView />}
          {tab === "review" && <ReviewView />}
        </div>
      </main>
      <Link
        href="/display"
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
        style={{
          background: "rgba(139,92,246,0.2)",
          border: "1px solid rgba(139,92,246,0.3)",
          color: "#a78bfa",
        }}
      >
        Display
      </Link>
    </div>
  );
}
