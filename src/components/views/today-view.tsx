"use client";

import { ActionTable } from "@/components/today/action-table";
import { NotesPanel } from "@/components/today/notes-panel";
import { StrategicPulseStrip } from "@/components/today/strategic-pulse-strip";
import type { TaskStore } from "@/lib/tasks/useTaskStore";

function getDateHeading(): string {
  const now = new Date();
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface TodayViewProps {
  store: TaskStore;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function TodayView({ store, selectedTaskId, onSelectTask }: TodayViewProps) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-[var(--md-text-primary)] tracking-tight">
        {getDateHeading()}
      </h1>

      {/* Action Table — full width, the main thing */}
      <ActionTable
        tasks={store.tasks}
        addTask={store.addTask}
        updateStatus={store.updateStatus}
        updateDate={store.updateDate}
        updateText={store.updateText}
        updateSubItems={store.updateSubItems}
        updateNotes={store.updateNotes}
        selectedTaskId={selectedTaskId}
        currentWeek={store.currentWeek}
      />

      {/* Rich Text Notes — full width */}
      <NotesPanel />

      {/* Strategic Pulse — compact strip at bottom */}
      <StrategicPulseStrip />
    </div>
  );
}
