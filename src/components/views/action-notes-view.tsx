"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFetch } from "@/lib/hooks";
import { StickyNote, Plus, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionNote {
  id: string;
  fields: {
    Label: string;
    Code: string;
    SortOrder?: number;
    CreatedAt: string;
  };
}

export function ActionNotesView() {
  const [notes, setNotes] = useState<ActionNote[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCode, setNewCode] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);

  const { data, refetch } = useFetch<ActionNote[]>("/api/action-notes");

  useEffect(() => {
    if (data) setNotes(data);
  }, [data]);

  useEffect(() => {
    if (adding) labelRef.current?.focus();
  }, [adding]);

  const handleAdd = useCallback(async () => {
    const label = newLabel.trim();
    const code = newCode.trim();
    if (!label || !code) {
      setAdding(false);
      setNewLabel("");
      setNewCode("");
      return;
    }

    const temp: ActionNote = {
      id: `temp-${Date.now()}`,
      fields: { Label: label, Code: code, CreatedAt: new Date().toISOString() },
    };
    setNotes((prev) => [...prev, temp]);
    setNewLabel("");
    setNewCode("");
    setAdding(false);

    try {
      await fetch("/api/action-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, code }),
      });
      refetch();
    } catch {
      setNotes((prev) => prev.filter((n) => n.id !== temp.id));
    }
  }, [newLabel, newCode, refetch]);

  const handleDelete = useCallback(
    async (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (!id.startsWith("temp-")) {
        try {
          await fetch(`/api/action-notes?id=${id}`, { method: "DELETE" });
        } catch {
          refetch();
        }
      }
    },
    [refetch]
  );

  const handleCopy = useCallback(async (id: string, code: string) => {
    let success = false;

    // Try modern API first (works on HTTPS and some HTTP localhost)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(code);
        success = true;
      } catch { /* fall through */ }
    }

    // Fallback: execCommand with textarea
    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        // Must be visible enough for selection to work
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.width = "2em";
        textarea.style.height = "2em";
        textarea.style.padding = "0";
        textarea.style.border = "none";
        textarea.style.outline = "none";
        textarea.style.boxShadow = "none";
        textarea.style.background = "transparent";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, code.length);
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch { /* ignore */ }
    }

    // Fallback: window.prompt for manual copy
    if (!success) {
      window.prompt("Copy this:", code);
    }

    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--md-text-primary)] tracking-tight">
          Action Notes
        </h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-violet-500/30 bg-[var(--card)] p-4 space-y-3">
          <input
            ref={labelRef}
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. SSH to server)"
            className="w-full px-3 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setAdding(false);
                setNewLabel("");
                setNewCode("");
              }
            }}
          />
          <textarea
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Command or note content..."
            className="w-full px-3 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono min-h-[80px] resize-y"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setNewLabel("");
                setNewCode("");
              }
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newCode.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                newLabel.trim() && newCode.trim()
                  ? "bg-violet-600 text-white hover:bg-violet-700"
                  : "bg-[var(--md-surface)] text-[var(--md-text-disabled)] cursor-not-allowed"
              )}
            >
              Save
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewLabel("");
                setNewCode("");
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--md-text-secondary)] hover:bg-[var(--md-surface)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4 group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-violet-500 shrink-0" />
                <span className="text-sm font-medium text-[var(--md-text-primary)]">
                  {note.fields.Label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(note.id, note.fields.Code)}
                  className="p-1.5 rounded-md text-[var(--md-text-tertiary)] hover:text-violet-500 hover:bg-[var(--md-surface)] transition-all"
                  title="Copy"
                >
                  {copiedId === note.id ? (
                    <Check className="w-3.5 h-3.5 text-[var(--md-success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] hover:bg-[var(--md-surface)] transition-all"
                  title="Delete"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <pre className="text-xs font-mono text-[var(--md-text-body)] bg-[var(--md-surface)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {note.fields.Code}
            </pre>
          </div>
        ))}
      </div>

      {notes.length === 0 && !adding && (
        <div className="text-center py-12">
          <StickyNote className="w-8 h-8 text-[var(--md-text-disabled)] mx-auto mb-3" />
          <p className="text-sm text-[var(--md-text-tertiary)]">
            No action notes yet. Add commands, snippets, or quick-reference notes.
          </p>
        </div>
      )}
    </div>
  );
}
