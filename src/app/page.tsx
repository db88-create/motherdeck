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
    <div className="flex h-dvh overflow-hidden">
      <Nav active={tab} onChange={setTab} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
        {tab === "command" && <CommandCenter />}
        {tab === "tasks" && <TasksView />}
        {tab === "usage" && <UsageView />}
        {tab === "ideas" && <IdeasExpensesView />}
        {tab === "briefs" && <BriefsView />}
      </main>
    </div>
  );
}
