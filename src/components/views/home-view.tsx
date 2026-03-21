"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Task, ActionNote as ActionNoteType } from "@/lib/types";
import { useNotes, Note } from "@/lib/hooks/useNotes";
import { useVoiceRecording } from "@/lib/hooks/useVoiceRecording";
import { useApi } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Copy,
  ChevronRight,
  AlertCircle,
  Calendar,
  Mic,
  MicOff,
  Send,
  CheckSquare,
  Lightbulb,
  Trash2,
  Clock,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";

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

// ─── Today Summary Card ───
function TodaySummary({ tasks }: { tasks: Task[] }) {
  const today = new Date().toISOString().split("T")[0];
  const activeTasks = tasks.filter((t) => t.fields.Status !== "done" && t.fields.Status !== "archived");
  const inProgress = activeTasks.filter((t) => t.fields.Status === "in_progress");
  const dueToday = activeTasks.filter((t) => t.fields.DueDate?.split("T")[0] === today);
  const urgent = activeTasks.filter((t) => t.fields.Priority === "urgent" || t.fields.Priority === "high");
  const completedToday = tasks.filter(
    (t) => t.fields.Status === "done" && t.fields.CompletedAt?.split("T")[0] === today
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs text-[var(--md-text-secondary)] mb-1">In Progress</div>
          <div className="text-2xl font-semibold text-[var(--md-text-primary)] tabular-nums">
            {inProgress.length}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs text-[var(--md-text-secondary)] mb-1">Due Today</div>
          <div className={cn("text-2xl font-semibold tabular-nums", dueToday.length > 0 ? "text-red-400" : "text-[var(--md-text-primary)]")}>
            {dueToday.length}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs text-[var(--md-text-secondary)] mb-1">High Priority</div>
          <div className={cn("text-2xl font-semibold tabular-nums", urgent.length > 0 ? "text-orange-400" : "text-[var(--md-text-primary)]")}>
            {urgent.length}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-4 pb-3">
          <div className="text-xs text-[var(--md-text-secondary)] mb-1">Done Today</div>
          <div className="text-2xl font-semibold text-emerald-500 tabular-nums">
            {completedToday.length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── This Week Section ───
function ThisWeek({ tasks }: { tasks: Task[] }) {
  const today = new Date().toISOString().split("T")[0];
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const upcoming = tasks
    .filter((t) => {
      const d = t.fields.DueDate?.split("T")[0];
      return d && d >= today && d <= weekEnd && t.fields.Status !== "done" && t.fields.Status !== "archived";
    })
    .sort((a, b) => (a.fields.DueDate || "").localeCompare(b.fields.DueDate || ""));

  // Group by project
  const byProject = new Map<string, Task[]>();
  for (const t of upcoming) {
    const proj = t.fields.Project || "Other";
    if (!byProject.has(proj)) byProject.set(proj, []);
    byProject.get(proj)!.push(t);
  }

  if (upcoming.length === 0) {
    return (
      <div className="text-sm text-[var(--md-text-tertiary)] italic py-2">
        Nothing due this week.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from(byProject.entries()).map(([project, projectTasks]) => (
        <div key={project}>
          <div className="text-xs font-medium text-[var(--md-text-tertiary)] uppercase tracking-wider mb-1.5 px-1">
            {project}
          </div>
          {projectTasks.map((t) => {
            const dueStr = t.fields.DueDate?.split("T")[0];
            const isToday = dueStr === today;
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-[var(--md-surface)] transition-colors"
              >
                <ChevronRight className="w-3 h-3 text-[var(--md-text-tertiary)]" />
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
                    "text-[11px] tabular-nums min-w-[50px] text-right",
                    isToday ? "text-red-400 font-semibold" : "text-[var(--md-text-tertiary)]"
                  )}
                >
                  {isToday ? "TODAY" : dueStr}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── In Progress Snapshot ───
function InProgressSnapshot({
  tasks,
}: {
  tasks: Task[];
}) {
  const inProgress = tasks
    .filter((t) => t.fields.Status === "in_progress")
    .sort((a, b) => {
      const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (po[a.fields.Priority] ?? 3) - (po[b.fields.Priority] ?? 3);
    });

  if (inProgress.length === 0) {
    return (
      <div className="text-sm text-[var(--md-text-tertiary)] italic py-2">
        Nothing in progress right now.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {inProgress.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-[var(--md-surface)] transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span className="flex-1 text-sm text-[var(--md-text-body)]">
            {t.fields.Name}
          </span>
          {t.fields.Project && (
            <span className="text-[10px] text-[var(--md-text-tertiary)]">
              {t.fields.Project}
            </span>
          )}
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase ${priorityColor(t.fields.Priority)}`}
          >
            {t.fields.Priority}
          </span>
        </div>
      ))}
    </div>
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
            placeholder="Spew it out... Raw thoughts, ideas, tasks, anything."
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
function ActionNoteCard({
  label,
  code,
  onCopy,
  onDelete,
}: {
  label: string;
  code: string;
  onCopy: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] group/action">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[var(--md-text-secondary)] mb-1">
          {label}
        </div>
        <code className="text-xs text-[var(--md-text-body)] bg-[var(--md-bg-alt)] px-2 py-1 rounded block overflow-x-auto whitespace-nowrap">
          {code}
        </code>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            onCopy();
          }}
          className="p-2 rounded-md hover:bg-[var(--md-bg-alt)] text-[var(--md-text-tertiary)] hover:text-[var(--md-text-body)] transition-colors"
          title="Copy to clipboard"
        >
          <Copy className="w-4 h-4" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-md hover:bg-red-500/10 text-[var(--md-text-disabled)] hover:text-red-500 transition-colors opacity-0 group-hover/action:opacity-100"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Home View ───
export function HomeView() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [actionNotes, setActionNotes] = useState<ActionNoteType[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const { post, del } = useApi();

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (Array.isArray(data)) setAllTasks(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchActionNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/action-notes");
      const data = await res.json();
      if (Array.isArray(data)) setActionNotes(data);
    } catch {}
  }, []);

  useEffect(() => { fetchTasks(); fetchActionNotes(); }, [fetchTasks, fetchActionNotes]);

  const handleAddActionNote = async () => {
    if (!newLabel.trim() || !newCode.trim()) return;
    try {
      const record = await post("/api/action-notes", {
        label: newLabel.trim(),
        code: newCode.trim(),
      });
      if (record?.id) {
        setActionNotes((prev) => [...prev, record]);
        setNewLabel("");
        setNewCode("");
        setShowAddForm(false);
        showToast("Action note created!");
      }
    } catch {}
  };

  const handleDeleteActionNote = async (id: string) => {
    try {
      await del(`/api/action-notes?id=${id}`);
      setActionNotes((prev) => prev.filter((n) => n.id !== id));
      showToast("Deleted");
    } catch {}
  };

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  }

  // Reminder counts
  const today = new Date().toISOString().split("T")[0];
  const activeTasks = allTasks.filter((t) => t.fields.Status !== "done" && t.fields.Status !== "archived");
  const urgent = activeTasks.filter((t) => t.fields.Priority === "urgent" || t.fields.Priority === "high");
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const dueThisWeek = activeTasks.filter((t) => {
    const d = t.fields.DueDate?.split("T")[0];
    return d && d >= today && d <= weekEnd;
  });

  return (
    <>
      <div className="space-y-8 max-w-5xl">
        {/* ── Reminders ── */}
        {!loading && (urgent.length > 0 || dueThisWeek.length > 0) && (
          <div className="flex flex-wrap gap-3">
            {urgent.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-400">
                  {urgent.length} high-priority item{urgent.length !== 1 ? "s" : ""} need attention
                </span>
              </div>
            )}
            {dueThisWeek.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  {dueThisWeek.length} task{dueThisWeek.length !== 1 ? "s" : ""} due this week
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Today at a Glance ── */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
            Today
          </h2>
          {loading ? (
            <div className="text-sm text-[var(--md-text-tertiary)] py-4">Loading…</div>
          ) : (
            <TodaySummary tasks={allTasks} />
          )}
        </section>

        {/* ── Two-column layout: Week + In Progress ── */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
                This Week
              </h2>
              <ThisWeek tasks={allTasks} />
            </section>

            <section>
              <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider mb-3">
                In Progress
              </h2>
              <InProgressSnapshot tasks={allTasks} />
            </section>
          </div>
        )}

        {/* ── Brain Dump ── */}
        <section>
          <BrainDump />
        </section>

        {/* ── Action Notes ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--md-text-primary)] uppercase tracking-wider">
              Action Notes
            </h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-200",
                showAddForm
                  ? "bg-[var(--md-surface)] text-[var(--md-text-body)]"
                  : "text-[var(--md-text-secondary)] hover:bg-[var(--md-surface)] hover:text-[var(--md-text-body)]"
              )}
            >
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showAddForm ? "Cancel" : "Add"}
            </button>
          </div>

          {showAddForm && (
            <div className="mb-3 p-4 rounded-lg border border-[var(--md-border)] bg-[var(--md-bg)] space-y-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (e.g. Deploy to prod)"
                className="w-full px-3 py-2 text-sm border border-[var(--md-border)] rounded-lg bg-[var(--md-bg)] text-[var(--md-text-body)] placeholder:text-[var(--md-text-disabled)] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-colors"
              />
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddActionNote();
                  }
                }}
                placeholder="Command / snippet to copy"
                className="w-full px-3 py-2 text-sm font-mono border border-[var(--md-border)] rounded-lg bg-[var(--md-bg)] text-[var(--md-text-body)] placeholder:text-[var(--md-text-disabled)] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-colors"
              />
              <button
                onClick={handleAddActionNote}
                disabled={!newLabel.trim() || !newCode.trim()}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  newLabel.trim() && newCode.trim()
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "bg-[var(--md-surface)] text-[var(--md-text-disabled)] cursor-not-allowed"
                )}
              >
                Save
              </button>
            </div>
          )}

          <div className="space-y-2">
            {actionNotes.map((note) => (
              <ActionNoteCard
                key={note.id}
                label={note.fields.Label}
                code={note.fields.Code}
                onCopy={() => showToast("Copied!")}
                onDelete={() => handleDeleteActionNote(note.id)}
              />
            ))}
            {actionNotes.length === 0 && !showAddForm && (
              <div className="text-sm text-[var(--md-text-tertiary)] italic py-2">
                No action notes yet. Click Add to create one.
              </div>
            )}
          </div>
        </section>
      </div>

      <Toast message={toast} show={!!toast} />
    </>
  );
}
