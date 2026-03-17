"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Task } from "@/lib/types";
import { useNotes, Note } from "@/lib/hooks/useNotes";
import { useVoiceRecording } from "@/lib/hooks/useVoiceRecording";
import { useApi } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  Trash2,
  Plus,
  Copy,
  ChevronRight,
  AlertCircle,
  Calendar,
  Mic,
  MicOff,
  Send,
  CheckSquare,
  Lightbulb,
} from "lucide-react";

// ─── Action Notes (static quick-reference items) ───
const ACTION_NOTES = [
  {
    label: "SSH into ClaudeClaw",
    code: "ssh -t claudeclaw@192.168.0.124 claude --dangerously-skip-permissions",
  },
];

// ─── Priority helpers ───
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

function priorityOrder(p: string) {
  switch (p) {
    case "urgent": return 0;
    case "high": return 1;
    case "medium": return 2;
    default: return 3;
  }
}

// ─── Toast ───
function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-[var(--md-success)] text-white text-sm font-medium shadow-lg transition-all duration-300 z-50 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      {message}
    </div>
  );
}

// ─── Kanban Card ───
function KanbanCard({
  task,
  onMove,
  onDelete,
}: {
  task: Task;
  onMove: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const dueStr = task.fields.DueDate?.split("T")[0];
  const isOverdue =
    dueStr && new Date(dueStr) < new Date(new Date().toISOString().split("T")[0]);

  return (
    <div className="group/card p-3 rounded-lg bg-[var(--md-bg)] border border-[var(--md-border)] hover:border-[var(--md-border-hover,var(--md-text-tertiary))] transition-colors">
      <div className="flex items-start gap-2">
        <span className="flex-1 text-sm text-[var(--md-text-body)] leading-snug">
          {task.fields.Name}
        </span>
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover/card:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all flex-shrink-0 mt-0.5"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor(task.fields.Priority)}`}
        >
          {task.fields.Priority}
        </span>
        {dueStr && (
          <span
            className={cn(
              "text-[10px] tabular-nums",
              isOverdue
                ? "text-red-400 font-medium"
                : "text-[var(--md-text-tertiary)]"
            )}
          >
            {isOverdue && "⚠ "}
            {dueStr}
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
        {task.fields.Status !== "todo" && task.fields.Status !== "backlog" && (
          <button
            onClick={() => onMove(task.id, task.fields.Status === "done" ? "in_progress" : "todo")}
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-[var(--md-text-body)] transition-colors"
          >
            ← Back
          </button>
        )}
        {task.fields.Status !== "done" && (
          <button
            onClick={() =>
              onMove(
                task.id,
                task.fields.Status === "in_progress" ? "done" : "in_progress"
              )
            }
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--md-surface)] text-[var(--md-text-secondary)] hover:text-[var(--md-text-body)] transition-colors"
          >
            {task.fields.Status === "in_progress" ? "Done →" : "Start →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ───
function KanbanColumn({
  title,
  tasks,
  color,
  onMove,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  color: string;
  onMove: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs font-semibold text-[var(--md-text-secondary)] uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] text-[var(--md-text-tertiary)] tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks
          .sort((a, b) => priorityOrder(a.fields.Priority) - priorityOrder(b.fields.Priority))
          .map((t) => (
            <KanbanCard key={t.id} task={t} onMove={onMove} onDelete={onDelete} />
          ))}
        {tasks.length === 0 && (
          <div className="text-xs text-[var(--md-text-tertiary)] italic py-4 text-center">
            Empty
          </div>
        )}
      </div>
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

// ─── Brain Dump ───
function BrainDump() {
  const {
    notes,
    addNote,
    removeNote,
    markConverted,
    totalNotes,
    tasksCreated,
    ideasCreated,
    pending,
  } = useNotes();
  const { post } = useApi();
  const [inputText, setInputText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceRecording({
    onTranscription: (text) => {
      if (text.trim()) addNote(text.trim());
    },
  });

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    addNote(inputText.trim());
    setInputText("");
    textareaRef.current?.focus();
  };

  const handleConvertToTask = async (note: Note) => {
    try {
      const res = await post("/api/tasks", {
        name: note.text.slice(0, 200),
        description: note.text.length > 200 ? note.text : "",
        status: "todo",
        priority: "medium",
      });
      if (res?.id) markConverted(note.id, "task", res.id);
    } catch {}
  };

  const handleConvertToIdea = async (note: Note) => {
    try {
      const res = await post("/api/ideas", {
        title: note.text.slice(0, 200),
        description: note.text.length > 200 ? note.text : "",
      });
      if (res?.id) markConverted(note.id, "idea", res.id);
    } catch {}
  };

  return (
    <Card className="bg-[var(--md-bg)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider">
            Brain Dump
          </CardTitle>
          <button
            onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200",
              voice.isRecording
                ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                : "text-[var(--md-text-secondary)] hover:bg-[var(--md-surface)] hover:text-[var(--md-text-body)]"
            )}
          >
            {voice.isRecording ? (
              <><MicOff className="w-4 h-4" /> Stop</>
            ) : (
              <><Mic className="w-4 h-4" /> Voice</>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {voice.isRecording && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-500/10 dark:border-red-500/20">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-600 dark:text-red-400">Recording...</span>
            <span className="text-xs text-[var(--md-text-tertiary)] tabular-nums ml-auto">
              {Math.floor(voice.duration / 60).toString().padStart(2, "0")}:
              {(voice.duration % 60).toString().padStart(2, "0")}
            </span>
          </div>
        )}

        {voice.transcript && !voice.isRecording && (
          <div className="px-4 py-3 bg-[var(--md-surface)] rounded-lg border border-[var(--md-border)]">
            <p className="text-xs text-[var(--md-text-secondary)] mb-1">Transcribed:</p>
            <p className="text-sm text-[var(--md-text-body)]">{voice.transcript}</p>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Spew it out... Raw thoughts, ideas, tasks, anything. They'll get organized."
            className="w-full h-24 p-4 font-mono text-sm border border-[var(--md-border)] rounded-lg bg-[var(--md-bg)] text-[var(--md-text-body)] placeholder:text-[var(--md-text-disabled)] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none resize-none transition-colors duration-200"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-[10px] text-[var(--md-text-disabled)]">{"\u2318"}+Enter</span>
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              className={cn(
                "p-1.5 rounded-md transition-all duration-200",
                inputText.trim()
                  ? "text-violet-600 hover:bg-[var(--md-highlight)]"
                  : "text-[var(--md-text-disabled)] cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {notes.length > 0 && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {notes.map((note) => {
              const time = new Date(note.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              const isConverted = !!note.converted;
              return (
                <div
                  key={note.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 rounded-lg group/note transition-all duration-200",
                    isConverted
                      ? "opacity-50"
                      : "bg-[var(--md-bg-alt)] hover:bg-[var(--md-surface)]"
                  )}
                >
                  <span className="text-xs text-[var(--md-text-tertiary)] flex-shrink-0 pt-0.5 tabular-nums">
                    {time}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm",
                      isConverted
                        ? "line-through text-[var(--md-text-tertiary)]"
                        : "text-[var(--md-text-body)]"
                    )}
                  >
                    {note.text}
                  </span>
                  {isConverted && (
                    <Badge
                      variant="outline"
                      className="text-[10px] shrink-0 border-emerald-300 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400"
                    >
                      {note.converted === "task" ? "Task" : "Idea"}
                    </Badge>
                  )}
                  {!isConverted && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover/note:opacity-100 transition-opacity duration-200 shrink-0">
                      {note.suggestion && note.suggestion.action !== "keep" && (
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium",
                            note.suggestion.action === "task"
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                          )}
                        >
                          {note.suggestion.action === "task" ? "Task?" : "Idea?"}
                        </span>
                      )}
                      <button
                        onClick={() => handleConvertToTask(note)}
                        className="p-1 text-[var(--md-text-disabled)] hover:text-violet-600 transition-colors rounded"
                        title="Convert to task"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleConvertToIdea(note)}
                        className="p-1 text-[var(--md-text-disabled)] hover:text-amber-500 transition-colors rounded"
                        title="Convert to idea"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeNote(note.id)}
                        className="p-1 text-[var(--md-text-disabled)] hover:text-red-500 transition-colors rounded"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalNotes > 0 && (
          <div className="pt-3 border-t border-[var(--md-border-light,var(--md-border))] text-xs text-[var(--md-text-tertiary)]">
            {totalNotes} capture{totalNotes !== 1 ? "s" : ""} · {tasksCreated} tasks · {ideasCreated} ideas
            {pending > 0 && <span> · {pending} pending</span>}
          </div>
        )}
      </CardContent>
    </Card>
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

// ─── Home View ───
export function HomeView() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllTasks(data);
      }
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

  async function moveTask(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchTasks();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchTasks();
  }

  // Split tasks for kanban
  const todoTasks = allTasks.filter(
    (t) => t.fields.Status === "todo" || t.fields.Status === "backlog"
  );
  const inProgressTasks = allTasks.filter(
    (t) => t.fields.Status === "in_progress"
  );
  const recentDone = allTasks
    .filter((t) => t.fields.Status === "done")
    .slice(0, 5);

  // Upcoming reminders: tasks with due dates in next 7 days
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const upcoming = allTasks
    .filter((t) => {
      const d = t.fields.DueDate?.split("T")[0];
      return d && d >= today && d <= weekEnd && t.fields.Status !== "done";
    })
    .sort((a, b) => {
      const da = a.fields.DueDate || "";
      const db = b.fields.DueDate || "";
      return da.localeCompare(db);
    });

  // Blocked/urgent items
  const urgentItems = allTasks.filter(
    (t) =>
      t.fields.Status !== "done" &&
      (t.fields.Priority === "urgent" || t.fields.Priority === "high")
  );

  return (
    <>
      <div className="space-y-8 max-w-5xl">
        {/* ── Reminders Bar ── */}
        {(upcoming.length > 0 || urgentItems.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {urgentItems.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">
                  {urgentItems.length} high-priority item{urgentItems.length !== 1 ? "s" : ""} need attention
                </span>
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  {upcoming.length} task{upcoming.length !== 1 ? "s" : ""} due this week
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Kanban Board ── */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-4">
            Tasks
          </h2>
          {loading ? (
            <div className="text-sm text-[var(--md-text-tertiary)] py-4">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KanbanColumn
                  title="To Do"
                  tasks={todoTasks}
                  color="bg-blue-500"
                  onMove={moveTask}
                  onDelete={deleteTask}
                />
                <KanbanColumn
                  title="In Progress"
                  tasks={inProgressTasks}
                  color="bg-amber-500"
                  onMove={moveTask}
                  onDelete={deleteTask}
                />
                <KanbanColumn
                  title="Done"
                  tasks={recentDone}
                  color="bg-emerald-500"
                  onMove={moveTask}
                  onDelete={deleteTask}
                />
              </div>
              <NewTaskForm onCreated={fetchTasks} />
            </>
          )}
        </section>

        {/* ── Upcoming This Week ── */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
              Due This Week
            </h2>
            <div className="space-y-1">
              {upcoming.map((t) => {
                const dueStr = t.fields.DueDate?.split("T")[0];
                const isToday = dueStr === today;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-[var(--md-surface)] transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--md-text-tertiary)]" />
                    <span className="flex-1 text-sm text-[var(--md-text-body)]">
                      {t.fields.Name}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor(t.fields.Priority)}`}
                    >
                      {t.fields.Priority}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] tabular-nums",
                        isToday
                          ? "text-red-400 font-semibold"
                          : "text-[var(--md-text-tertiary)]"
                      )}
                    >
                      {isToday ? "TODAY" : dueStr}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Brain Dump ── */}
        <section>
          <BrainDump />
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
      </div>

      <Toast message={toast} show={!!toast} />
    </>
  );
}
