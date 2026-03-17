"use client";

import { useState, useEffect, useCallback } from "react";
import { Task } from "@/lib/types";
import {
  Check,
  Trash2,
  Plus,
  Copy,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

// ─── Action Notes (static quick-reference items) ───
const ACTION_NOTES = [
  {
    label: "SSH into ClaudeClaw",
    code: "ssh -t claudeclaw@192.168.0.124 claude --dangerously-skip-permissions",
  },
];

// ─── Priority badge colors ───
function priorityColor(p: string) {
  switch (p) {
    case "urgent":
      return "bg-red-500/15 text-red-400 border-red-500/20";
    case "high":
      return "bg-orange-500/15 text-orange-400 border-orange-500/20";
    case "medium":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
    default:
      return "bg-[var(--md-surface)] text-[var(--md-text-secondary)] border-[var(--md-border)]";
  }
}

// ─── Toast Component ───
function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-[var(--md-success)] text-white text-sm font-medium shadow-lg transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      {message}
    </div>
  );
}

// ─── Task Item ───
function TaskItem({
  task,
  onComplete,
  onDelete,
  showDate,
}: {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) {
  const [subtasks, setSubtasks] = useState<
    { text: string; done: boolean }[]
  >([]);
  const [expanded, setExpanded] = useState(false);
  const [newSub, setNewSub] = useState("");

  // Parse checklist from task fields
  useEffect(() => {
    if (task.fields.Checklist) {
      try {
        setSubtasks(JSON.parse(task.fields.Checklist));
      } catch {
        /* ignore */
      }
    }
  }, [task.fields.Checklist]);

  const hasSubtasks = subtasks.length > 0;

  async function toggleSubtask(idx: number) {
    const updated = subtasks.map((s, i) =>
      i === idx ? { ...s, done: !s.done } : s
    );
    setSubtasks(updated);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: JSON.stringify(updated) }),
    });
  }

  async function addSubtask() {
    if (!newSub.trim()) return;
    const updated = [...subtasks, { text: newSub.trim(), done: false }];
    setSubtasks(updated);
    setNewSub("");
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: JSON.stringify(updated) }),
    });
  }

  const dueStr = task.fields.DueDate?.split("T")[0];

  return (
    <div className="group">
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--md-surface)] transition-colors">
        {/* Check-off button */}
        <button
          onClick={() => onComplete(task.id)}
          className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-[var(--md-border)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors flex items-center justify-center"
          title="Mark done"
        >
          <Check className="w-3 h-3 text-transparent group-hover:text-[var(--primary)]" />
        </button>

        {/* Expand toggle if has subtasks */}
        {(hasSubtasks || true) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 w-4 h-4 text-[var(--md-text-tertiary)] hover:text-[var(--md-text-secondary)]"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Task name */}
        <span className="flex-1 text-[var(--md-text-body)] text-sm">
          {task.fields.Name}
        </span>

        {/* Priority badge */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor(task.fields.Priority)}`}
        >
          {task.fields.Priority}
        </span>

        {/* Due date */}
        {showDate && dueStr && (
          <span className="text-[11px] text-[var(--md-text-tertiary)] tabular-nums">
            {dueStr}
          </span>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(task.id)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subtasks */}
      {expanded && (
        <div className="ml-12 mb-1">
          {subtasks.map((sub, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 py-1 text-sm text-[var(--md-text-secondary)]"
            >
              <button
                onClick={() => toggleSubtask(idx)}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${sub.done ? "bg-[var(--md-success)] border-[var(--md-success)]" : "border-[var(--md-border)]"}`}
              >
                {sub.done && <Check className="w-2.5 h-2.5 text-white" />}
              </button>
              <span className={sub.done ? "line-through opacity-50" : ""}>
                {sub.text}
              </span>
            </div>
          ))}
          {/* Add subtask inline */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSubtask();
            }}
            className="flex items-center gap-2 py-1"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--md-text-tertiary)]" />
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              placeholder="Add subtask…"
              className="flex-1 bg-transparent text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] outline-none"
            />
          </form>
        </div>
      )}
    </div>
  );
}

// ─── New Task Form ───
function NewTaskForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        priority,
        dueDate: dueDate || undefined,
        status: "todo",
      }),
    });
    setName("");
    setPriority("medium");
    setDueDate("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add a new task…"
        className="flex-1 px-3 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] outline-none focus:border-[var(--primary)] transition-colors"
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="px-2 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-xs text-[var(--md-text-secondary)] outline-none"
      >
        <option value="low">Low</option>
        <option value="medium">Med</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="px-2 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-xs text-[var(--md-text-secondary)] outline-none"
      />
      <button
        type="submit"
        className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Plus className="w-4 h-4" />
      </button>
    </form>
  );
}

// ─── Action Note Card ───
function ActionNote({
  label,
  code,
  onCopy,
}: {
  label: string;
  code: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)]">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--md-text-secondary)] mb-1">
          {label}
        </div>
        <code className="text-xs text-[var(--md-text-body)] bg-[var(--md-bg-alt)] px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
          {code}
        </code>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          onCopy();
        }}
        className="flex-shrink-0 p-2 rounded-md hover:bg-[var(--md-bg-alt)] text-[var(--md-text-tertiary)] hover:text-[var(--md-text-body)] transition-colors"
        title="Copy to clipboard"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Theme Toggle ───
function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("motherdeck-theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-[var(--md-surface)] text-[var(--md-text-secondary)] transition-colors"
      title="Toggle theme"
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

// ─── Main Page ───
export default function Home() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [weekTasks, setWeekTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/home");
      const data = await res.json();
      setTodayTasks(data.today || []);
      setWeekTasks(data.week || []);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  }

  async function completeTask(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    fetchTasks();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  }

  return (
    <div className="min-h-dvh bg-[var(--md-bg)]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 md:px-10 max-w-3xl mx-auto">
        <h1 className="text-lg font-semibold text-[var(--md-text-primary)] tracking-tight">
          MotherDeck
        </h1>
        <ThemeToggle />
      </header>

      <main className="px-6 md:px-10 pb-16 max-w-3xl mx-auto space-y-10">
        {/* ── Today's To-Do ── */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
            Today
          </h2>
          {loading ? (
            <div className="text-sm text-[var(--md-text-tertiary)] py-4">
              Loading…
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="text-sm text-[var(--md-text-tertiary)] py-4 italic">
              Nothing on the plate today. Nice.
            </div>
          ) : (
            <div className="space-y-0.5">
              {todayTasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onComplete={completeTask}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── This Week ── */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
            This Week
          </h2>
          {loading ? (
            <div className="text-sm text-[var(--md-text-tertiary)] py-4">
              Loading…
            </div>
          ) : weekTasks.length === 0 ? (
            <div className="text-sm text-[var(--md-text-tertiary)] py-4 italic">
              Week&apos;s clear.
            </div>
          ) : (
            <div className="space-y-0.5">
              {weekTasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  onComplete={completeTask}
                  onDelete={deleteTask}
                  showDate
                />
              ))}
            </div>
          )}
          <NewTaskForm onCreated={fetchTasks} />
        </section>

        {/* ── Action Notes ── */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
            Action Notes
          </h2>
          <div className="space-y-2">
            {ACTION_NOTES.map((note, i) => (
              <ActionNote
                key={i}
                label={note.label}
                code={note.code}
                onCopy={() => showToast("Copied!")}
              />
            ))}
          </div>
        </section>
      </main>

      <Toast message={toast} show={!!toast} />
    </div>
  );
}
