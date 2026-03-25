"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { CommandTask, TaskStatus } from "@/lib/tasks/types";
import type { SubItem } from "@/components/today/sub-items";
import { SubItemsList } from "@/components/today/sub-items";
import { DatePicker } from "@/components/today/date-picker";
import {
  toDateStr,
  todayStr,
  getMondayStr,
  addDays,
  formatDueDate,
} from "@/lib/tasks/date-utils";
import {
  Plus,
  Square,
  CheckSquare2,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskStore } from "@/lib/tasks/useTaskStore";

/* ── Day column types ── */

interface DayColumn {
  dateStr: string;
  label: string; // "Monday", "Tuesday", etc.
  shortDate: string; // "Mar 25"
  isToday: boolean;
  isPast: boolean;
  tasks: CommandTask[];
}

/* ══════════════════════════════════════════════════════
   WEEK ACTION ROW — same as today's but always shows detail
   ══════════════════════════════════════════════════════ */

function WeekActionRow({
  task,
  onCheck,
  onEditSave,
  onDateChange,
  onSubItemsChange,
  onNotesChange,
}: {
  task: CommandTask;
  onCheck: (task: CommandTask) => void;
  onEditSave: (id: string, text: string) => void;
  onDateChange: (id: string, dateStr: string) => void;
  onSubItemsChange: (id: string, subs: SubItem[]) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [notesText, setNotesText] = useState(task.notes);
  const [fadeOut, setFadeOut] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setNotesText(task.notes);
  }, [task.notes]);

  const subItems = task.subItems;
  const subDone = subItems.filter((s) => s.done).length;
  const isDone = task.status === "done";

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDone) {
      setFadeOut(true);
      setTimeout(() => {
        onCheck(task);
        setFadeOut(false);
      }, 300);
    } else {
      onCheck(task);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const t = editText.trim();
      if (t) onEditSave(task.id, t);
      setEditing(false);
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotesText(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      onNotesChange(task.id, value);
    }, 500);
  };

  return (
    <div className={cn("transition-all duration-300", fadeOut && "opacity-30 scale-[0.98]")}>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--md-surface)] transition-colors group cursor-pointer",
          isDone && "opacity-50"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <button className="shrink-0 text-[var(--md-text-tertiary)]">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        <button onClick={handleCheck} className="shrink-0">
          {isDone ? (
            <CheckSquare2 className="w-4 h-4 text-[var(--md-success)]" />
          ) : (
            <Square className="w-4 h-4 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors" />
          )}
        </button>

        {editing ? (
          <input
            ref={editRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => {
              const t = editText.trim();
              if (t) onEditSave(task.id, t);
              setEditing(false);
            }}
            className="flex-1 text-sm bg-transparent text-[var(--md-text-body)] focus:outline-none"
            autoComplete="off"
          />
        ) : (
          <span
            className={cn(
              "flex-1 text-sm leading-relaxed",
              isDone ? "line-through text-[var(--md-text-tertiary)]" : "text-[var(--md-text-body)]"
            )}
          >
            {task.text}
          </span>
        )}

        {subItems.length > 0 && (
          <span className="shrink-0 text-xs text-[var(--md-text-tertiary)]">
            {subDone}/{subItems.length}
          </span>
        )}
      </div>

      {expanded && (
        <div className="ml-8 mr-2 mb-2 mt-0.5 space-y-2">
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditText(task.text); }}
              className="text-xs text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors"
            >
              Edit title
            </button>
          )}

          <div>
            <textarea
              value={notesText}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full text-xs px-2.5 py-2 rounded-md bg-[var(--md-surface)] border border-[var(--md-border-light)] text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-violet-500/20 resize-none"
            />
          </div>

          <SubItemsList items={subItems} onChange={(updated) => onSubItemsChange(task.id, updated)} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DAY SECTION — one day of the week
   ══════════════════════════════════════════════════════ */

function DaySection({
  day,
  onCheck,
  onEditSave,
  onDateChange,
  onSubItemsChange,
  onNotesChange,
  onAddTask,
}: {
  day: DayColumn;
  onCheck: (task: CommandTask) => void;
  onEditSave: (id: string, text: string) => void;
  onDateChange: (id: string, dateStr: string) => void;
  onSubItemsChange: (id: string, subs: SubItem[]) => void;
  onNotesChange: (id: string, notes: string) => void;
  onAddTask: (text: string, dateStr: string) => void;
}) {
  const [newText, setNewText] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  const activeTasks = day.tasks.filter((t) => t.status !== "done");
  const doneTasks = day.tasks.filter((t) => t.status === "done");
  const [showDone, setShowDone] = useState(false);

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    onAddTask(text, day.dateStr);
    setNewText("");
    addRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setNewText("");
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--card)] p-4",
        day.isToday
          ? "border-violet-500/40 ring-1 ring-violet-500/20"
          : day.isPast
          ? "border-[var(--md-border-light)] opacity-75"
          : "border-[var(--md-border)]"
      )}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "text-sm font-semibold",
              day.isToday ? "text-violet-500" : "text-[var(--md-text-primary)]"
            )}
          >
            {day.label}
          </h3>
          <span className="text-xs text-[var(--md-text-tertiary)]">{day.shortDate}</span>
          {day.isToday && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--md-text-tertiary)]">
          {activeTasks.length} item{activeTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Quick add */}
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={addRef}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add action..."
          className="w-full px-3 py-1.5 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all"
          autoComplete="off"
        />
      </div>

      {/* Active tasks */}
      {activeTasks.length > 0 ? (
        <div className="space-y-0.5">
          {activeTasks.map((task) => (
            <WeekActionRow
              key={task.id}
              task={task}
              onCheck={onCheck}
              onEditSave={onEditSave}
              onDateChange={onDateChange}
              onSubItemsChange={onSubItemsChange}
              onNotesChange={onNotesChange}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--md-text-tertiary)] italic text-center py-3">No actions yet</p>
      )}

      {/* Done tasks */}
      {doneTasks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--md-border-light)]">
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-1 text-xs text-[var(--md-success)] hover:text-[var(--md-success)] transition-colors"
          >
            {showDone ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>{doneTasks.length} completed</span>
          </button>
          {showDone && (
            <div className="space-y-0.5 mt-1">
              {doneTasks.map((task) => (
                <WeekActionRow
                  key={task.id}
                  task={task}
                  onCheck={onCheck}
                  onEditSave={onEditSave}
                  onDateChange={onDateChange}
                  onSubItemsChange={onSubItemsChange}
                  onNotesChange={onNotesChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   UNSCHEDULED SECTION
   ══════════════════════════════════════════════════════ */

function UnscheduledSection({
  tasks,
  onCheck,
  onEditSave,
  onDateChange,
  onSubItemsChange,
  onNotesChange,
}: {
  tasks: CommandTask[];
  onCheck: (task: CommandTask) => void;
  onEditSave: (id: string, text: string) => void;
  onDateChange: (id: string, dateStr: string) => void;
  onSubItemsChange: (id: string, subs: SubItem[]) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-dashed border-[var(--md-border)] bg-[var(--card)] p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-[var(--md-text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--md-text-tertiary)]" />}
        <h3 className="text-sm font-semibold text-[var(--md-text-secondary)]">Unscheduled</h3>
        <span className="text-xs text-[var(--md-text-tertiary)]">
          {tasks.length} item{tasks.length !== 1 ? "s" : ""} — drag dates to schedule
        </span>
      </button>

      {expanded && (
        <div className="space-y-0.5 mt-3">
          {tasks.map((task) => (
            <WeekActionRow
              key={task.id}
              task={task}
              onCheck={onCheck}
              onEditSave={onEditSave}
              onDateChange={onDateChange}
              onSubItemsChange={onSubItemsChange}
              onNotesChange={onNotesChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN WEEK VIEW
   ══════════════════════════════════════════════════════ */

interface WeekViewProps {
  store: TaskStore;
}

export function WeekView({ store }: WeekViewProps) {
  const today = todayStr();
  const monday = getMondayStr();

  const days: DayColumn[] = useMemo(() => {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    return dayNames.map((name, i) => {
      const dateStr = addDays(monday, i);
      const d = new Date(dateStr + "T12:00:00");
      return {
        dateStr,
        label: name,
        shortDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: dateStr === today,
        isPast: dateStr < today,
        tasks: store.tasks
          .filter((t) => t.dueDate === dateStr)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
    });
  }, [store.tasks, monday, today]);

  const unscheduled = useMemo(
    () => store.tasks.filter((t) => !t.dueDate && t.status !== "done"),
    [store.tasks]
  );

  const weekLabel = (() => {
    const monDate = new Date(monday + "T12:00:00");
    const friDate = new Date(addDays(monday, 4) + "T12:00:00");
    const monStr = monDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const friStr = friDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${monStr} – ${friStr}`;
  })();

  const totalActive = store.tasks.filter((t) => t.status !== "done").length;
  const totalDone = store.tasks.filter((t) => t.status === "done").length;

  const handleCheck = useCallback(
    (task: CommandTask) => {
      store.updateStatus(task.id, task.status === "done" ? "active" : "done");
    },
    [store]
  );

  const handleAddTask = useCallback(
    (text: string, dateStr: string) => {
      store.addTask(text, dateStr);
    },
    [store]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--md-text-primary)] tracking-tight">
            Week Plan
          </h1>
          <p className="text-sm text-[var(--md-text-tertiary)] mt-1">{weekLabel}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-[var(--md-text-tertiary)]">
            {totalActive} active · {totalDone} done
          </span>
        </div>
      </div>

      {/* Day sections */}
      <div className="space-y-4">
        {days.map((day) => (
          <DaySection
            key={day.dateStr}
            day={day}
            onCheck={handleCheck}
            onEditSave={store.updateText}
            onDateChange={store.updateDate}
            onSubItemsChange={store.updateSubItems}
            onNotesChange={store.updateNotes}
            onAddTask={handleAddTask}
          />
        ))}
      </div>

      {/* Unscheduled */}
      <UnscheduledSection
        tasks={unscheduled}
        onCheck={handleCheck}
        onEditSave={store.updateText}
        onDateChange={store.updateDate}
        onSubItemsChange={store.updateSubItems}
        onNotesChange={store.updateNotes}
      />
    </div>
  );
}
