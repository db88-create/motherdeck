"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import type { FocusItem } from "@/lib/services/weekly-focus";
import { serializeSubItems } from "@/components/today/sub-items";
import { normalizeFocusItem } from "./normalize";
import { toDateStr } from "./date-utils";
import type { CommandTask, SubItem, TaskStatus } from "./types";

interface WeeklyFocusData {
  week: { id: string; weekStartDate: string; archived: boolean };
  items: FocusItem[];
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<CommandTask[]>([]);
  const [initialized, setInitialized] = useState(false);
  const { data, loading, error, refetch } = useFetch<WeeklyFocusData>("/api/weekly-focus?all=true");
  const { post, patch } = useApi();
  const snapshotRef = useRef<CommandTask[]>([]);

  const currentWeek = data?.week ?? null;

  useEffect(() => {
    if (data?.items) {
      setTasks(data.items.map(normalizeFocusItem));
      if (!initialized) setInitialized(true);
    }
  }, [data, initialized]);

  const rollback = useCallback(() => {
    setTasks(snapshotRef.current);
    refetch();
  }, [refetch]);

  const snapshot = useCallback(() => {
    snapshotRef.current = tasks;
  }, [tasks]);

  const addTask = useCallback(
    async (text: string, dueDate?: string) => {
      const dateStr = dueDate ? toDateStr(dueDate) : "";
      const tempTask: CommandTask = {
        id: `temp-${Date.now()}`,
        weekId: currentWeek?.id || "",
        text,
        status: "active",
        sortOrder: tasks.length,
        notes: "",
        subItems: [],
        dueDate: dateStr,
        createdAt: new Date().toISOString(),
      };

      snapshot();
      setTasks((prev) => [...prev, tempTask]);

      try {
        const body: Record<string, unknown> = { text, sortOrder: tasks.length };
        if (dateStr) body.dueDate = dateStr;
        await post("/api/weekly-focus", body);
        refetch();
      } catch {
        rollback();
      }
    },
    [tasks.length, currentWeek?.id, post, refetch, snapshot, rollback]
  );

  const updateStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      snapshot();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      try {
        await patch("/api/weekly-focus", { id, status });
      } catch {
        rollback();
      }
    },
    [patch, snapshot, rollback]
  );

  const updateDate = useCallback(
    async (id: string, dueDate: string) => {
      const normalized = toDateStr(dueDate) || dueDate;
      snapshot();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: normalized } : t)));
      if (!id.startsWith("temp-")) {
        try {
          await patch("/api/weekly-focus", { id, dueDate: normalized || null });
        } catch {
          rollback();
        }
      }
    },
    [patch, snapshot, rollback]
  );

  const updateText = useCallback(
    async (id: string, text: string) => {
      snapshot();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
      try {
        await patch("/api/weekly-focus", { id, text });
      } catch {
        rollback();
      }
    },
    [patch, snapshot, rollback]
  );

  const updateSubItems = useCallback(
    async (id: string, subItems: SubItem[]) => {
      const serialized = serializeSubItems(subItems);
      snapshot();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, subItems } : t)));
      if (!id.startsWith("temp-")) {
        try {
          await patch("/api/weekly-focus", { id, subItems: serialized });
        } catch {
          rollback();
        }
      }
    },
    [patch, snapshot, rollback]
  );

  const updateNotes = useCallback(
    async (id: string, notes: string) => {
      snapshot();
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, notes } : t)));
      if (!id.startsWith("temp-")) {
        try {
          await patch("/api/weekly-focus", { id, notes });
        } catch {
          rollback();
        }
      }
    },
    [patch, snapshot, rollback]
  );

  return {
    tasks,
    currentWeek,
    loading,
    error,
    initialized,
    addTask,
    updateStatus,
    updateDate,
    updateText,
    updateSubItems,
    updateNotes,
    refetch,
  };
}

export type TaskStore = ReturnType<typeof useTaskStore>;
