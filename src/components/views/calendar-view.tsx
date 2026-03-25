"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { CommandTask, TaskStatus } from "@/lib/tasks/types";
import { toCalendarEvents } from "@/lib/tasks/to-calendar-events";
import { formatDueDate } from "@/lib/tasks/date-utils";
import { Plus, X } from "lucide-react";

const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });

interface CalendarViewProps {
  tasks: CommandTask[];
  addTask: (text: string, dueDate?: string) => void;
  updateStatus: (id: string, status: TaskStatus) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string | null) => void;
}

export function CalendarView({
  tasks,
  addTask,
  updateStatus,
  selectedTaskId,
  onSelectTask,
}: CalendarViewProps) {
  const [plugins, setPlugins] = useState<any[] | null>(null);
  const [addBarDate, setAddBarDate] = useState<string | null>(null);
  const [addText, setAddText] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      import("@fullcalendar/daygrid").then((m) => m.default),
      import("@fullcalendar/interaction").then((m) => m.default),
    ]).then(([dg, ia]) => {
      setPlugins([dg, ia]);
    });
  }, []);

  useEffect(() => {
    if (addBarDate) addInputRef.current?.focus();
  }, [addBarDate]);

  const events = useMemo(() => toCalendarEvents(tasks), [tasks]);

  const handleDateClick = (info: { dateStr: string }) => {
    setAddBarDate(info.dateStr);
    setAddText("");
  };

  const handleEventClick = (info: { event: { id: string } }) => {
    onSelectTask(info.event.id);
  };

  const handleAddSubmit = () => {
    const text = addText.trim();
    if (!text || !addBarDate) return;
    addTask(text, addBarDate);
    setAddText("");
    setAddBarDate(null);
  };

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubmit();
    } else if (e.key === "Escape") {
      setAddBarDate(null);
      setAddText("");
    }
  };

  if (!plugins) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--md-text-tertiary)]">
        Loading calendar...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-[var(--md-text-primary)] tracking-tight">
        Calendar
      </h2>

      {/* Add task bar */}
      {addBarDate && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-violet-500/30 bg-violet-500/5">
          <span className="text-xs font-medium text-violet-500 shrink-0">
            {formatDueDate(addBarDate)}
          </span>
          <input
            ref={addInputRef}
            type="text"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="New task..."
            className="flex-1 px-2 py-1.5 rounded-md bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            autoComplete="off"
          />
          <button
            onClick={handleAddSubmit}
            className="shrink-0 p-1.5 rounded-md bg-violet-500 text-white hover:bg-violet-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setAddBarDate(null); setAddText(""); }}
            className="shrink-0 p-1.5 rounded-md text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FullCalendar */}
      <div className="fc-md-wrapper rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4 overflow-hidden">
        <FullCalendar
          plugins={plugins}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          firstDay={1}
          height="auto"
          dayMaxEvents={4}
          fixedWeekCount={false}
          eventDisplay="block"
        />
      </div>
    </div>
  );
}
