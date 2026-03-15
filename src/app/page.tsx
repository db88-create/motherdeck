"use client";

import { useState } from "react";
import { Nav, TabId } from "@/components/nav";
import { CommandCenter } from "@/components/views/command-center";
import { TasksView } from "@/components/views/tasks-view";
import { UsageView } from "@/components/views/usage-view";
import { IdeasExpensesView } from "@/components/views/ideas-expenses-view";
import { BriefsView } from "@/components/views/briefs-view";

export default function Home() {
  const [tab, setTab] = useState<TabId>("command");

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <Nav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto px-6 py-8 md:px-8 md:py-8 lg:px-10 pb-24 md:pb-8 max-w-[1200px]">
        {tab === "command" && <CommandCenter />}
        {tab === "tasks" && <TasksView />}
        {tab === "usage" && <UsageView />}
        {tab === "ideas" && <IdeasExpensesView />}
        {tab === "briefs" && <BriefsView />}
      </main>
    </div>
  );
}
