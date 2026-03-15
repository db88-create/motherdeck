"use client";

import { useState, useRef } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import { useNotes, Note } from "@/lib/hooks/useNotes";
import { useVoiceRecording } from "@/lib/hooks/useVoiceRecording";
import { CronJob, Gateway, Alert } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Server,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Mic,
  MicOff,
  Lightbulb,
  CheckSquare,
  Trash2,
  Send,
} from "lucide-react";

interface CommandData {
  cronJobs: CronJob[];
  sessions: any[];
  gateway: Gateway | null;
  alerts: Alert[];
  todaySpend: number;
  dailyBudget: number;
}

export function CommandCenter() {
  const { data, loading } = useFetch<CommandData>(
    "/api/command-center",
    60000
  );

  if (loading) return <LoadingSkeleton />;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold text-[var(--md-text-primary)]">
        Command Center
      </h1>

      {/* Stats Row */}
      <StatsRow data={data} />

      {/* Main Content: Brain Dump + Errors/Cron */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <BrainDumpCanvas />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <ErrorsSection alerts={data.alerts} />
          <CronJobsCompact cronJobs={data.cronJobs} />
        </div>
      </div>
    </div>
  );
}

// ============ STATS ROW ============

function StatsRow({ data }: { data: CommandData }) {
  const spendPct = Math.min(
    (data.todaySpend / data.dailyBudget) * 100,
    100
  );
  const gw = data.gateway?.fields;
  const errorCount = data.alerts.filter(
    (a) => a.fields.Severity === "critical" || a.fields.Severity === "warning"
  ).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Server className="w-4 h-4 text-[var(--md-text-tertiary)]" />
            <span className="text-xs text-[var(--md-text-secondary)]">Gateway</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                gw?.Status === "online" ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            <span className="text-sm font-semibold text-[var(--md-text-primary)]">
              {gw?.Status || "Unknown"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-[var(--md-text-tertiary)]" />
            <span className="text-xs text-[var(--md-text-secondary)]">Today&apos;s Spend</span>
          </div>
          <p className="text-lg font-semibold text-[var(--md-text-primary)] tabular-nums">
            ${data.todaySpend.toFixed(2)}
          </p>
          <Progress value={spendPct} className="mt-1.5 h-1.5" />
        </CardContent>
      </Card>

      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-[var(--md-text-tertiary)]" />
            <span className="text-xs text-[var(--md-text-secondary)]">Alerts</span>
          </div>
          <p className="text-lg font-semibold text-[var(--md-text-primary)]">
            {errorCount}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-[var(--md-bg)]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-[var(--md-text-tertiary)]" />
            <span className="text-xs text-[var(--md-text-secondary)]">Cron Jobs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-[var(--md-text-primary)]">
              {data.cronJobs.length}
            </span>
            {data.cronJobs.some((j) => j.fields.ConsecutiveErrors > 0) && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                errors
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ BRAIN DUMP CANVAS ============

function BrainDumpCanvas() {
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
      if (text.trim()) {
        addNote(text.trim());
      }
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
      if (res?.id) {
        markConverted(note.id, "task", res.id);
      }
    } catch {}
  };

  const handleConvertToIdea = async (note: Note) => {
    try {
      const res = await post("/api/ideas", {
        title: note.text.slice(0, 200),
        description: note.text.length > 200 ? note.text : "",
      });
      if (res?.id) {
        markConverted(note.id, "idea", res.id);
      }
    } catch {}
  };

  return (
    <Card className="bg-[var(--md-bg)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-[var(--md-text-primary)]">
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
        {/* Recording indicator */}
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

        {/* Text input */}
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
            className="w-full h-28 p-4 font-mono text-sm border border-[var(--md-border)] rounded-lg bg-[var(--md-bg)] text-[var(--md-text-body)] placeholder:text-[var(--md-text-disabled)] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none resize-none transition-colors duration-200"
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

        {/* Notes list */}
        {notes.length > 0 && (
          <div className="space-y-1.5">
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                onConvertToTask={() => handleConvertToTask(note)}
                onConvertToIdea={() => handleConvertToIdea(note)}
                onRemove={() => removeNote(note.id)}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {totalNotes > 0 && (
          <div className="pt-4 border-t border-[var(--md-border-light)] text-sm text-[var(--md-text-secondary)]">
            {totalNotes} capture{totalNotes !== 1 ? "s" : ""} &middot;{" "}
            {tasksCreated} converted to tasks &middot; {ideasCreated} to ideas
            {pending > 0 && (
              <span className="text-[var(--md-text-tertiary)]">
                {" "}&middot; {pending} pending
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ NOTE ITEM ============

function NoteItem({
  note,
  onConvertToTask,
  onConvertToIdea,
  onRemove,
}: {
  note: Note;
  onConvertToTask: () => void;
  onConvertToIdea: () => void;
  onRemove: () => void;
}) {
  const time = new Date(note.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const isConverted = !!note.converted;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg group transition-all duration-200",
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
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
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
            onClick={onConvertToTask}
            className="p-1 text-[var(--md-text-disabled)] hover:text-violet-600 transition-colors duration-200 rounded"
            title="Convert to task"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onConvertToIdea}
            className="p-1 text-[var(--md-text-disabled)] hover:text-amber-500 transition-colors duration-200 rounded"
            title="Convert to idea"
          >
            <Lightbulb className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-[var(--md-text-disabled)] hover:text-red-500 transition-colors duration-200 rounded"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============ ERRORS SECTION ============

function ErrorsSection({ alerts }: { alerts: Alert[] }) {
  const errors = alerts.filter(
    (a) => a.fields.Severity === "critical" || a.fields.Severity === "warning"
  );
  if (errors.length === 0) return null;

  return (
    <Card className="bg-[var(--md-bg)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[var(--md-text-primary)] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Errors & Warnings
          <Badge variant="destructive" className="text-[10px] ml-auto">
            {errors.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {errors.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "px-3 py-2.5 rounded-lg border text-sm",
              alert.fields.Severity === "critical"
                ? "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20"
                : "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20"
            )}
          >
            <p className="font-medium text-[var(--md-text-body)] text-sm">
              {alert.fields.Title}
            </p>
            <p className="text-xs text-[var(--md-text-secondary)] mt-0.5">
              {alert.fields.Message}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============ CRON JOBS COMPACT ============

function CronJobsCompact({ cronJobs }: { cronJobs: CronJob[] }) {
  if (cronJobs.length === 0) return null;
  const recent = cronJobs.slice(0, 5);

  return (
    <Card className="bg-[var(--md-bg)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[var(--md-text-primary)] flex items-center gap-2">
          <Clock className="w-4 h-4" /> Cron Jobs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {recent.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--md-bg-alt)]"
          >
            {job.fields.LastResult === "success" ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : job.fields.LastResult === "error" ? (
              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-[var(--md-text-tertiary)] shrink-0" />
            )}
            <span className="text-sm text-[var(--md-text-body)] truncate flex-1">
              {job.fields.Name}
            </span>
            <span className="text-[10px] text-[var(--md-text-tertiary)] font-mono shrink-0">
              {job.fields.Schedule}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============ LOADING / EMPTY ============

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="h-8 w-48 bg-[var(--md-surface)] rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-[var(--md-bg-alt)] border border-[var(--md-border)] rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="h-64 bg-[var(--md-bg-alt)] border border-[var(--md-border)] rounded-xl animate-pulse" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Server className="w-12 h-12 text-[var(--md-text-disabled)] mx-auto mb-3" />
        <p className="text-[var(--md-text-secondary)]">
          Connect Airtable to see your command center
        </p>
        <p className="text-xs text-[var(--md-text-tertiary)] mt-1">
          Add AIRTABLE_PAT and AIRTABLE_BASE_ID to .env.local
        </p>
      </div>
    </div>
  );
}
