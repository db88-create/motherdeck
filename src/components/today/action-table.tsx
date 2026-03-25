"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import type { InboxItem } from "@/lib/services/inbox";
import { SubItemsList, type SubItem } from "./sub-items";
import { DatePicker } from "./date-picker";
import type { CommandTask, TaskStatus } from "@/lib/tasks/types";
import { groupTasks } from "@/lib/tasks/group-tasks";
import {
  toDateStr,
  todayStr,
  getSundayStr,
  addDays,
  formatDueDate,
  formatShortDay,
} from "@/lib/tasks/date-utils";
import {
  Plus,
  Square,
  CheckSquare2,
  Calendar,
  X,
  ChevronDown,
  ChevronRight,
  Inbox,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Props ── */

interface ActionTableProps {
  tasks: CommandTask[];
  addTask: (text: string, dueDate?: string) => void;
  updateStatus: (id: string, status: TaskStatus) => void;
  updateDate: (id: string, dueDate: string) => void;
  updateText: (id: string, text: string) => void;
  updateSubItems: (id: string, subItems: SubItem[]) => void;
  updateNotes: (id: string, notes: string) => void;
  selectedTaskId: string | null;
  currentWeek: { id: string; weekStartDate: string; archived: boolean } | null;
}

/* ══════════════════════════════════════════════════════
   QUICK DATE POPOVER
   Uses a backdrop overlay instead of document mousedown.
   Clicks always land on buttons reliably.
   ══════════════════════════════════════════════════════ */

function QuickDatePopover({
  onSelect,
  onPickDate,
  onClose,
}: {
  onSelect: (dateStr: string) => void;
  onPickDate: () => void;
  onClose: () => void;
}) {
  const today = todayStr();

  const buttons: { label: string; dateStr: string }[] = [];
  buttons.push({ label: "Today", dateStr: today });
  buttons.push({ label: "Tomorrow", dateStr: addDays(today, 1) });

  for (let i = 2; i <= 6; i++) {
    const ds = addDays(today, i);
    const d = new Date(ds + "T12:00:00");
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    buttons.push({ label: formatShortDay(ds), dateStr: ds });
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 mt-1 bg-[var(--card)] border border-[var(--md-border)] rounded-lg shadow-xl p-2 min-w-[180px]" style={{ right: 0 }}>
        <div className="flex flex-wrap gap-1">
          {buttons.map((b) => (
            <button
              key={b.label}
              onClick={() => onSelect(b.dateStr)}
              className="text-xs px-2 py-1.5 rounded-md bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
            >
              {b.label}
            </button>
          ))}
        </div>
        <button
          onClick={onPickDate}
          className="mt-1.5 w-full text-xs px-2 py-1.5 rounded-md text-[var(--md-text-tertiary)] hover:text-violet-500 hover:bg-violet-500/10 transition-colors text-left"
        >
          Pick date...
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   ACTION ROW
   ══════════════════════════════════════════════════════ */

function ActionRow({
  task,
  onCheck,
  onEditSave,
  onDateChange,
  onClearDate,
  onSubItemsChange,
  onNotesChange,
  showDateAs,
  isSelected,
}: {
  task: CommandTask;
  onCheck: (task: CommandTask) => void;
  onEditSave: (id: string, text: string) => void;
  onDateChange: (id: string, dateStr: string) => void;
  onClearDate: (id: string) => void;
  onSubItemsChange: (id: string, subs: SubItem[]) => void;
  onNotesChange: (id: string, notes: string) => void;
  showDateAs?: string;
  isSelected?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showQuickDate, setShowQuickDate] = useState(false);
  const [showFullDatePicker, setShowFullDatePicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [notesText, setNotesText] = useState(task.notes);
  const editRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setExpanded(true);
    }
  }, [isSelected]);

  useEffect(() => {
    setNotesText(task.notes);
  }, [task.notes]);

  const subItems = task.subItems;
  const subDone = subItems.filter((s) => s.done).length;
  const isDone = task.status === "done";
  const isOverdue = task.dueDate && task.dueDate < todayStr() && !isDone;

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

  const dateDisplay = showDateAs ?? (task.dueDate ? formatDueDate(task.dueDate) : "");

  return (
    <div ref={rowRef} className={cn("transition-all duration-300", fadeOut && "opacity-30 scale-[0.98]", isSelected && "ring-2 ring-violet-500/40 rounded-lg")}>
      {/* Main row — clickable to expand */}
      <div
        className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--md-surface)] transition-colors group cursor-pointer", isDone && "opacity-50")}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand indicator — always visible */}
        <button className="shrink-0 text-[var(--md-text-tertiary)]">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Checkbox */}
        <button onClick={handleCheck} className="shrink-0">
          {isDone ? (
            <CheckSquare2 className="w-4 h-4 text-[var(--md-success)]" />
          ) : (
            <Square className="w-4 h-4 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors" />
          )}
        </button>

        {/* Title */}
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

        {/* Subtask count badge */}
        {subItems.length > 0 && (
          <span className="shrink-0 text-xs text-[var(--md-text-tertiary)]">
            {subDone}/{subItems.length}
          </span>
        )}

        {/* Due date badge / assign date */}
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          {task.dueDate ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowQuickDate(!showQuickDate); setShowFullDatePicker(false); }}
                className={cn("text-xs px-1.5 py-0.5 rounded", isOverdue ? "text-red-500 bg-red-500/10" : "text-[var(--md-text-tertiary)] hover:text-violet-500")}
              >
                {dateDisplay}
              </button>
              <button
                onClick={() => onClearDate(task.id)}
                className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowQuickDate(!showQuickDate); setShowFullDatePicker(false); }}
              className="text-xs text-[var(--md-text-disabled)] hover:text-violet-500 transition-colors px-1.5 py-0.5"
            >
              assign date
            </button>
          )}

          {showQuickDate && !showFullDatePicker && (
            <QuickDatePopover
              onSelect={(dateStr) => {
                onDateChange(task.id, dateStr);
                setShowQuickDate(false);
              }}
              onPickDate={() => {
                setShowQuickDate(false);
                setShowFullDatePicker(true);
              }}
              onClose={() => setShowQuickDate(false)}
            />
          )}

          {showFullDatePicker && (
            <div className="absolute z-50 right-0 mt-1">
              <DatePicker
                value={task.dueDate}
                onChange={(iso) => {
                  onDateChange(task.id, toDateStr(iso));
                  setShowFullDatePicker(false);
                }}
                onClose={() => setShowFullDatePicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="ml-8 mr-2 mb-2 mt-0.5 space-y-2">
          {/* Edit title */}
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditText(task.text); }}
              className="text-xs text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors"
            >
              Edit title
            </button>
          )}

          {/* Notes */}
          <div>
            <textarea
              value={notesText}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="w-full text-xs px-2.5 py-2 rounded-md bg-[var(--md-surface)] border border-[var(--md-border-light)] text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-violet-500/20 resize-none"
            />
          </div>

          {/* Subtasks */}
          <SubItemsList items={subItems} onChange={(updated) => onSubItemsChange(task.id, updated)} />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   INBOX ROW
   ══════════════════════════════════════════════════════ */

function InboxRow({
  item,
  onDismiss,
  onPromote,
}: {
  item: InboxItem;
  onDismiss: (id: string) => void;
  onPromote: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--md-surface)] transition-colors group">
      <Inbox className="w-3.5 h-3.5 text-violet-400 shrink-0" />
      <span className="flex-1 text-sm text-[var(--md-text-body)] leading-relaxed">{item.content}</span>
      <button
        onClick={() => onPromote(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-success)] transition-all shrink-0"
        title="Process"
      >
        <Archive className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onDismiss(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   REST OF WEEK GRID
   ══════════════════════════════════════════════════════ */

function RestOfWeekGrid({
  tasks,
  onCheck,
  onEditSave,
  onDateChange,
  onClearDate,
  onSubItemsChange,
  onNotesChange,
  selectedTaskId,
}: {
  tasks: CommandTask[];
  onCheck: (task: CommandTask) => void;
  onEditSave: (id: string, text: string) => void;
  onDateChange: (id: string, dateStr: string) => void;
  onClearDate: (id: string) => void;
  onSubItemsChange: (id: string, subs: SubItem[]) => void;
  onNotesChange: (id: string, notes: string) => void;
  selectedTaskId: string | null;
}) {
  const today = todayStr();
  const sunday = getSundayStr();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const columns = useMemo(() => {
    const cols: { dateStr: string; dayItems: CommandTask[] }[] = [];
    for (let i = 1; i <= 7; i++) {
      const ds = addDays(today, i);
      if (ds > sunday) break;
      const d = new Date(ds + "T12:00:00");
      const dow = d.getDay();
      const dayItems = tasks.filter((t) => t.dueDate === ds && t.status !== "done");
      if ((dow === 0 || dow === 6) && dayItems.length === 0) continue;
      cols.push({ dateStr: ds, dayItems });
    }
    return cols;
  }, [tasks, today, sunday]);

  if (columns.length === 0) return null;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-1.5 mb-1">
        <div className="h-px flex-1 bg-[var(--md-border-light)]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--md-text-tertiary)]">Rest of Week</span>
        <div className="h-px flex-1 bg-[var(--md-border-light)]" />
      </div>
      <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((col) => {
          const d = new Date(col.dateStr + "T12:00:00");
          const isExpanded = expandedDay === col.dateStr;
          return (
            <div
              key={col.dateStr}
              className={cn(
                "rounded-lg border bg-[var(--md-surface)] p-1.5 min-h-[60px] cursor-pointer transition-colors",
                isExpanded ? "border-violet-500/40 bg-violet-500/5" : "border-[var(--md-border-light)] hover:border-[var(--md-border)]"
              )}
              onClick={() => setExpandedDay(isExpanded ? null : col.dateStr)}
            >
              <div className="text-center mb-1">
                <div className="text-[10px] font-semibold uppercase text-[var(--md-text-tertiary)]">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={cn("text-sm font-semibold", isExpanded ? "text-violet-500" : "text-[var(--md-text-primary)]")}>{d.getDate()}</div>
              </div>
              <div className="space-y-0.5">
                {col.dayItems.length > 0 && (
                  <div className="text-[10px] text-center text-[var(--md-text-tertiary)]">
                    {col.dayItems.length} item{col.dayItems.length !== 1 ? "s" : ""}
                  </div>
                )}
                {col.dayItems.length === 0 && (
                  <div className="text-[10px] text-[var(--md-text-disabled)] text-center italic">&mdash;</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded day panel — full-width below the grid */}
      {expandedDay && (() => {
        const col = columns.find((c) => c.dateStr === expandedDay);
        if (!col) return null;
        const d = new Date(col.dateStr + "T12:00:00");
        const dayLabel = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
        return (
          <div className="rounded-lg border border-violet-500/20 bg-[var(--card)] p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-violet-500 uppercase tracking-wider">{dayLabel}</span>
              <button
                onClick={() => setExpandedDay(null)}
                className="text-[var(--md-text-tertiary)] hover:text-[var(--md-text-secondary)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {col.dayItems.length > 0 ? (
              <div className="space-y-0.5">
                {col.dayItems.map((task) => (
                  <ActionRow
                    key={task.id}
                    task={task}
                    onCheck={onCheck}
                    onEditSave={onEditSave}
                    onDateChange={onDateChange}
                    onClearDate={onClearDate}
                    onSubItemsChange={onSubItemsChange}
                    onNotesChange={onNotesChange}
                    showDateAs={formatShortDay(task.dueDate)}
                    isSelected={task.id === selectedTaskId}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--md-text-tertiary)] italic text-center py-2">No tasks for this day.</p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN ACTION TABLE
   ══════════════════════════════════════════════════════ */

export function ActionTable({
  tasks,
  addTask,
  updateStatus,
  updateDate,
  updateText,
  updateSubItems,
  updateNotes,
  selectedTaskId,
  currentWeek,
}: ActionTableProps) {
  const [newText, setNewText] = useState("");
  const [newDatePicker, setNewDatePicker] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [unscheduledCollapsed, setUnscheduledCollapsed] = useState(true);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Inbox state (stays local — not shared with calendar)
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [inboxCollapsed, setInboxCollapsed] = useState(false);
  const { data: inboxData, refetch: refetchInbox } = useFetch<InboxItem[]>("/api/inbox?processed=false");

  useEffect(() => {
    if (inboxData) setInboxItems(inboxData);
  }, [inboxData]);

  const today = todayStr();

  const { todayItems, restOfWeekItems, unscheduledItems, completedThisWeek } = useMemo(
    () => groupTasks(tasks, today),
    [tasks, today]
  );

  const totalDone = completedThisWeek.length;
  const totalAll = tasks.length;

  /* ── Actions (delegate to store) ── */

  const handleAdd = useCallback(() => {
    const text = newText.trim();
    if (!text) return;
    const dateStr = toDateStr(newDate);
    addTask(text, dateStr || undefined);
    setNewText("");
    setNewDate("");
    addInputRef.current?.focus();
  }, [newText, newDate, addTask]);

  const handleCheck = useCallback(
    (task: CommandTask) => {
      const newStatus = task.status === "done" ? "active" : "done";
      updateStatus(task.id, newStatus);
    },
    [updateStatus]
  );

  const handleEditSave = useCallback(
    (id: string, text: string) => {
      updateText(id, text);
    },
    [updateText]
  );

  const handleDateChange = useCallback(
    (id: string, dateStr: string) => {
      updateDate(id, dateStr);
    },
    [updateDate]
  );

  const handleClearDate = useCallback(
    (id: string) => {
      updateDate(id, "");
    },
    [updateDate]
  );

  const handleSubItemsChange = useCallback(
    (id: string, subs: SubItem[]) => {
      updateSubItems(id, subs);
    },
    [updateSubItems]
  );

  const handleNotesChange = useCallback(
    (id: string, notes: string) => {
      updateNotes(id, notes);
    },
    [updateNotes]
  );

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setNewText("");
      setNewDate("");
      addInputRef.current?.blur();
    }
  };

  /* ── Inbox handlers (local) ── */

  const handleInboxDismiss = useCallback(
    async (id: string) => {
      setInboxItems((prev) => prev.filter((i) => i.id !== id));
      if (!id.startsWith("temp-")) {
        try {
          await fetch(`/api/inbox?id=${id}`, { method: "DELETE" });
        } catch {
          refetchInbox();
        }
      }
    },
    [refetchInbox]
  );

  const handleInboxPromote = useCallback(
    async (id: string) => {
      setInboxItems((prev) => prev.filter((i) => i.id !== id));
      if (!id.startsWith("temp-")) {
        try {
          await fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, processed: true }),
          });
        } catch {
          refetchInbox();
        }
      }
    },
    [refetchInbox]
  );

  /* ── Render ── */

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">Actions</h3>
        <span className="text-xs text-[var(--md-text-tertiary)]">{totalDone}/{totalAll} done</span>
      </div>

      {/* Quick-add bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 flex items-center">
          <input
            ref={addInputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Add an action..."
            className="w-full px-3 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all pr-9"
            autoComplete="off"
          />
          <button
            onClick={() => setNewDatePicker(!newDatePicker)}
            className={cn("absolute right-2 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors", newDate && "text-violet-500")}
            title="Set due date"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>
        {newDate && (
          <div className="flex items-center gap-1 text-xs text-violet-500 shrink-0">
            <span>{formatDueDate(newDate)}</span>
            <button onClick={() => setNewDate("")} className="text-[var(--md-text-tertiary)] hover:text-[var(--md-error)]">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Date picker for new item */}
      {newDatePicker && (
        <div className="relative mb-3 ml-2">
          <DatePicker
            value={newDate}
            onChange={(iso) => {
              setNewDate(toDateStr(iso));
              setNewDatePicker(false);
              addInputRef.current?.focus();
            }}
            onClose={() => setNewDatePicker(false)}
          />
        </div>
      )}

      {/* Inbox section */}
      {inboxItems.length > 0 && (
        <div className="mb-3">
          <button onClick={() => setInboxCollapsed(!inboxCollapsed)} className="flex items-center gap-1.5 mb-1 w-full text-left">
            {inboxCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-violet-400" /> : <ChevronDown className="w-3.5 h-3.5 text-violet-400" />}
            <Inbox className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-400">Inbox</span>
            <span className="text-[11px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 rounded-full">{inboxItems.length}</span>
          </button>
          {!inboxCollapsed && (
            <div className="space-y-0.5 ml-1">
              {inboxItems.map((item) => (
                <InboxRow key={item.id} item={item} onDismiss={handleInboxDismiss} onPromote={handleInboxPromote} />
              ))}
            </div>
          )}
          <div className="border-b border-[var(--md-border-light)] mt-2" />
        </div>
      )}

      {/* ── TODAY section ── */}
      <div className="mb-1">
        <div className="flex items-center gap-2 py-1.5 mb-1">
          <div className="h-px flex-1 bg-[var(--md-border-light)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-500">Today ({todayLabel})</span>
          <span className="text-[11px] text-[var(--md-text-tertiary)]">{todayItems.length} item{todayItems.length !== 1 ? "s" : ""}</span>
          <div className="h-px flex-1 bg-[var(--md-border-light)]" />
        </div>

        {todayItems.length > 0 ? (
          <div className="space-y-0.5 ml-1">
            {todayItems.map((task) => (
              <ActionRow
                key={task.id}
                task={task}
                onCheck={handleCheck}
                onEditSave={handleEditSave}
                onDateChange={handleDateChange}
                onClearDate={handleClearDate}
                onSubItemsChange={handleSubItemsChange}
                onNotesChange={handleNotesChange}
                showDateAs={formatDueDate(task.dueDate)}
                isSelected={task.id === selectedTaskId}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--md-text-tertiary)] italic text-center py-2">Nothing due today. Add something above or assign a date.</p>
        )}
      </div>

      {/* ── REST OF WEEK grid ── */}
      <RestOfWeekGrid
        tasks={tasks}
        onCheck={handleCheck}
        onEditSave={handleEditSave}
        onDateChange={handleDateChange}
        onClearDate={handleClearDate}
        onSubItemsChange={handleSubItemsChange}
        onNotesChange={handleNotesChange}
        selectedTaskId={selectedTaskId}
      />

      {/* ── UNSCHEDULED section ── */}
      {unscheduledItems.length > 0 && (
        <div className="mb-1">
          <div className="flex items-center gap-2 py-1.5 mb-1">
            <div className="h-px flex-1 bg-[var(--md-border-light)]" />
            <button onClick={() => setUnscheduledCollapsed(!unscheduledCollapsed)} className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--md-text-tertiary)]">Unscheduled</span>
              <span className="text-[11px] text-[var(--md-text-tertiary)]">{unscheduledItems.length} item{unscheduledItems.length !== 1 ? "s" : ""}</span>
              {unscheduledCollapsed ? <ChevronRight className="w-3 h-3 text-[var(--md-text-tertiary)]" /> : <ChevronDown className="w-3 h-3 text-[var(--md-text-tertiary)]" />}
            </button>
            <div className="h-px flex-1 bg-[var(--md-border-light)]" />
          </div>

          {!unscheduledCollapsed && (
            <div className="space-y-0.5 ml-1">
              {unscheduledItems.map((task) => (
                <ActionRow
                  key={task.id}
                  task={task}
                  onCheck={handleCheck}
                  onEditSave={handleEditSave}
                  onDateChange={handleDateChange}
                  onClearDate={handleClearDate}
                  onSubItemsChange={handleSubItemsChange}
                onNotesChange={handleNotesChange}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPLETED THIS WEEK section ── */}
      {completedThisWeek.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--md-border-light)]">
          <div className="flex items-center gap-2 py-1.5 mb-1">
            <div className="h-px flex-1 bg-[var(--md-border-light)]" />
            <button onClick={() => setCompletedCollapsed(!completedCollapsed)} className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--md-success)]">Completed</span>
              <span className="text-[11px] text-[var(--md-text-tertiary)]">{completedThisWeek.length}</span>
              {completedCollapsed ? <ChevronRight className="w-3 h-3 text-[var(--md-text-tertiary)]" /> : <ChevronDown className="w-3 h-3 text-[var(--md-text-tertiary)]" />}
            </button>
            <div className="h-px flex-1 bg-[var(--md-border-light)]" />
          </div>

          {!completedCollapsed && (
            <div className="space-y-0.5 ml-1">
              {completedThisWeek.map((task) => (
                <ActionRow
                  key={task.id}
                  task={task}
                  onCheck={handleCheck}
                  onEditSave={handleEditSave}
                  onDateChange={handleDateChange}
                  onClearDate={handleClearDate}
                  onSubItemsChange={handleSubItemsChange}
                onNotesChange={handleNotesChange}
                  showDateAs={task.dueDate ? `done ${formatDueDate(task.dueDate)}` : "done"}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && inboxItems.length === 0 && (
        <p className="text-sm text-[var(--md-text-tertiary)] italic text-center py-4">No actions yet. Add one above.</p>
      )}
    </div>
  );
}
