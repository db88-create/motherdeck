"use client";

import { useState, useEffect, useCallback } from "react";

export interface Note {
  id: string;
  text: string;
  timestamp: string;
  suggestion?: {
    action: "task" | "idea" | "keep";
    reason: string;
    confidence: number;
  } | null;
  converted?: "task" | "idea" | null;
  convertedId?: string;
}

// Map Airtable record to Note
function recordToNote(record: any): Note {
  const f = record.fields || record;
  return {
    id: record.id,
    text: f.Text || "",
    timestamp: f.Timestamp || new Date().toISOString(),
    suggestion: f.Suggestion
      ? {
          action: f.Suggestion,
          reason: f.SuggestionReason || "",
          confidence: f.SuggestionConfidence || 0.5,
        }
      : null,
    converted: f.Converted || null,
    convertedId: f.ConvertedId || undefined,
  };
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from API
  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) {
        const records = await res.json();
        if (Array.isArray(records)) {
          setNotes(records.map(recordToNote));
        }
      }
    } catch {
      // Silent fail — notes still work from local state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
    // Poll every 30s to pick up suggestion updates from nook cron
    const interval = setInterval(fetchNotes, 30000);
    return () => clearInterval(interval);
  }, [fetchNotes]);

  const addNote = useCallback(
    async (text: string) => {
      if (!text.trim()) return null;

      // Optimistic: add locally immediately
      const tempId = `temp-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const tempNote: Note = {
        id: tempId,
        text: text.trim(),
        timestamp,
        suggestion: null,
        converted: null,
      };
      setNotes((prev) => [...prev, tempNote]);

      // Persist to Airtable
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text.trim(), timestamp }),
        });
        if (res.ok) {
          const record = await res.json();
          const real = recordToNote(record);
          // Replace temp with real record
          setNotes((prev) =>
            prev.map((n) => (n.id === tempId ? real : n))
          );
          return real;
        }
      } catch {}

      return tempNote;
    },
    []
  );

  const removeNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch("/api/notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {}
  }, []);

  const markConverted = useCallback(
    async (id: string, type: "task" | "idea", convertedId?: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, converted: type, convertedId } : n
        )
      );
      try {
        await fetch("/api/notes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            converted: type,
            convertedId: convertedId || "",
          }),
        });
      } catch {}
    },
    []
  );

  const setSuggestion = useCallback(
    (id: string, suggestion: Note["suggestion"]) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, suggestion } : n))
      );
      // No API call here — suggestions come from the nook cron
    },
    []
  );

  // Stats
  const totalNotes = notes.length;
  const tasksCreated = notes.filter((n) => n.converted === "task").length;
  const ideasCreated = notes.filter((n) => n.converted === "idea").length;
  const pending = notes.filter((n) => !n.converted).length;

  return {
    notes,
    loading,
    addNote,
    removeNote,
    markConverted,
    setSuggestion,
    fetchNotes,
    totalNotes,
    tasksCreated,
    ideasCreated,
    pending,
  };
}
