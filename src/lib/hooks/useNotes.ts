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

const STORAGE_KEY = "motherdeck-notes";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: Note[] = JSON.parse(raw);
    // Only show today's notes
    const today = new Date().toISOString().split("T")[0];
    return all.filter((n) => n.timestamp.startsWith(today));
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  if (typeof window === "undefined") return;
  // Keep last 7 days of notes
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Note[] = raw ? JSON.parse(raw) : [];
    // Remove today's notes from stored, replace with current
    const today = new Date().toISOString().split("T")[0];
    const other = all.filter(
      (n) => !n.timestamp.startsWith(today) && n.timestamp > cutoffStr
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...other, ...notes]));
  } catch {}
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNotes(loadNotes());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) saveNotes(notes);
  }, [notes, loading]);

  const addNote = useCallback((text: string) => {
    if (!text.trim()) return;
    const note: Note = {
      id: crypto.randomUUID(),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      suggestion: null,
      converted: null,
    };
    setNotes((prev) => [...prev, note]);
    return note;
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const markConverted = useCallback(
    (id: string, type: "task" | "idea", convertedId?: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, converted: type, convertedId } : n
        )
      );
    },
    []
  );

  const setSuggestion = useCallback(
    (id: string, suggestion: Note["suggestion"]) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, suggestion } : n))
      );
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
    updateNote,
    markConverted,
    setSuggestion,
    totalNotes,
    tasksCreated,
    ideasCreated,
    pending,
  };
}
