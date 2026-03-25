"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFetch } from "@/lib/hooks";
import type { DailyNote } from "@/lib/services/daily-notes";
import { FileText, Check } from "lucide-react";

export function DailyNotePanel() {
  const [content, setContent] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [initialized, setInitialized] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data } = useFetch<DailyNote>("/api/daily-notes");

  // Load from server once
  useEffect(() => {
    if (data && !initialized) {
      setContent(data.content || "");
      setNoteId(data.id);
      setInitialized(true);
    }
  }, [data, initialized]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(300, el.scrollHeight) + "px";
    }
  }, [content]);

  // Debounced save
  const save = useCallback(
    async (text: string) => {
      if (!noteId) return;
      setSaveState("saving");
      try {
        await fetch("/api/daily-notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: noteId, content: text }),
        });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
      }
    },
    [noteId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveState("idle");

    // Debounce save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(newContent), 500);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-[var(--md-text-tertiary)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">
          Notes
        </h3>
        <span className="text-xs text-[var(--md-text-tertiary)] ml-1">Persistent</span>
        <div className="ml-auto">
          {saveState === "saving" && (
            <span className="text-xs text-[var(--md-text-tertiary)]">Saving...</span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-[var(--md-success)] flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        placeholder="Start typing... meeting notes, thoughts, anything. This note persists — it's your running log."
        className="w-full min-h-[300px] resize-none bg-transparent text-sm text-[var(--md-text-body)] leading-relaxed placeholder:text-[var(--md-text-tertiary)] focus:outline-none"
        spellCheck={true}
      />
    </div>
  );
}
