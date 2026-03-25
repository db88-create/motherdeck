"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFetch, useApi } from "@/lib/hooks";
import type { FocusItem } from "@/lib/services/weekly-focus";
import { SubItemsList, parseSubItems, serializeSubItems, type SubItem } from "./sub-items";
import { DatePicker } from "./date-picker";
import { Target, Plus, Square, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeeklyFocusData {
  week: { id: string; weekStartDate: string; archived: boolean };
  items: FocusItem[];
}

function formatDueDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return "Today" + (d.getHours() ? ` ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "");
  if (isTomorrow) return "Tomorrow" + (d.getHours() ? ` ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    (d.getHours() ? ` ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "");
}

function isOverdue(iso: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export function WeeklyFocusPanel() {
  const [items, setItems] = useState<FocusItem[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [datePickerId, setDatePickerId] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { post, patch } = useApi();

  const { data, refetch } = useFetch<WeeklyFocusData>("/api/weekly-focus");

  useEffect(() => {
    if (data?.items) {
      setItems(data.items);
      if (!initialized) setInitialized(true);
    }
  }, [data, initialized]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const handleAdd = useCallback(async () => {
    const text = newText.trim();
    if (!text) return;

    const tempItem: FocusItem = {
      id: `temp-${Date.now()}`,
      weekId: data?.week?.id || "",
      text,
      status: "active",
      sortOrder: items.length,
      notes: "",
      subItems: "[]",
      dueDate: "",
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, tempItem]);
    setNewText("");
    addInputRef.current?.focus();

    try {
      await post("/api/weekly-focus", { text, sortOrder: items.length });
      refetch();
    } catch {
      setItems((prev) => prev.filter((i) => i.id !== tempItem.id));
    }
  }, [newText, items.length, data?.week?.id, post, refetch]);

  const handleCheck = useCallback(
    async (item: FocusItem) => {
      const newStatus = item.status === "done" ? "active" : "done";
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
      );
      try {
        await patch("/api/weekly-focus", { id: item.id, status: newStatus });
      } catch {
        refetch();
      }
    },
    [patch, refetch]
  );

  const handleEditSave = useCallback(
    async (id: string) => {
      const text = editText.trim();
      if (!text) {
        setEditingId(null);
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
      setEditingId(null);
      try {
        await patch("/api/weekly-focus", { id, text });
      } catch {
        refetch();
      }
    },
    [editText, patch, refetch]
  );

  const handleDateChange = useCallback(
    async (itemId: string, iso: string) => {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, dueDate: iso } : i))
      );
      setDatePickerId(null);
      if (!itemId.startsWith("temp-")) {
        try {
          await patch("/api/weekly-focus", { id: itemId, dueDate: iso || null });
        } catch {
          refetch();
        }
      }
    },
    [patch, refetch]
  );

  const handleClearDate = useCallback(
    async (itemId: string) => {
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, dueDate: "" } : i))
      );
      setDatePickerId(null);
      if (!itemId.startsWith("temp-")) {
        try {
          await patch("/api/weekly-focus", { id: itemId, dueDate: null });
        } catch {
          refetch();
        }
      }
    },
    [patch, refetch]
  );

  const handleSubItemsChange = useCallback(
    async (itemId: string, subItems: SubItem[]) => {
      const serialized = serializeSubItems(subItems);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, subItems: serialized } : i))
      );
      if (!itemId.startsWith("temp-")) {
        try {
          await patch("/api/weekly-focus", { id: itemId, subItems: serialized });
        } catch {
          refetch();
        }
      }
    },
    [patch, refetch]
  );

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setNewText("");
      addInputRef.current?.blur();
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEditSave(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const weekLabel = data?.week?.weekStartDate
    ? `Week of ${new Date(data.week.weekStartDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "";

  // Sort: items with dates first (by date), then items without dates
  const activeItems = items
    .filter((i) => i.status === "active" || i.status === "deferred")
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return a.sortOrder - b.sortOrder;
    });
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-violet-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">
          Weekly Focus
        </h3>
        {weekLabel && (
          <span className="text-xs text-[var(--md-text-tertiary)] ml-1">{weekLabel}</span>
        )}
        <span className="ml-auto text-xs text-[var(--md-text-tertiary)]">
          {doneCount}/{items.length} done
        </span>
      </div>

      <div className="space-y-0.5">
        {activeItems.map((item, idx) => {
          const subItems = parseSubItems(item.subItems);

          if (editingId === item.id) {
            return (
              <div key={item.id}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span className="text-xs text-[var(--md-text-tertiary)] w-4 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, item.id)}
                    onBlur={() => handleEditSave(item.id)}
                    className="flex-1 text-sm bg-transparent text-[var(--md-text-body)] focus:outline-none"
                    autoComplete="off"
                  />
                </div>
                <SubItemsList
                  items={subItems}
                  onChange={(updated) => handleSubItemsChange(item.id, updated)}
                />
              </div>
            );
          }

          return (
            <div key={item.id}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--md-surface)] transition-colors group">
                <span className="text-xs text-[var(--md-text-tertiary)] w-4 text-right shrink-0">
                  {idx + 1}.
                </span>
                <button
                  onClick={() => handleCheck(item)}
                  className="shrink-0 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors"
                >
                  <Square className="w-4 h-4" />
                </button>
                <span
                  className="flex-1 text-sm cursor-pointer leading-relaxed text-[var(--md-text-body)]"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditText(item.text);
                  }}
                >
                  {item.text}
                </span>

                {/* Date display / picker */}
                {item.dueDate ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setDatePickerId(datePickerId === item.id ? null : item.id)}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        isOverdue(item.dueDate)
                          ? "text-red-500 bg-red-500/10"
                          : "text-[var(--md-text-tertiary)] hover:text-violet-500"
                      )}
                    >
                      {formatDueDate(item.dueDate)}
                    </button>
                    <button
                      onClick={() => handleClearDate(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDatePickerId(datePickerId === item.id ? null : item.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-all shrink-0"
                    title="Set date"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Calendar date picker */}
              {datePickerId === item.id && (
                <div className="relative ml-10">
                  <DatePicker
                    value={item.dueDate}
                    onChange={(iso) => handleDateChange(item.id, iso)}
                    onClose={() => setDatePickerId(null)}
                  />
                </div>
              )}

              <SubItemsList
                items={subItems}
                onChange={(updated) => handleSubItemsChange(item.id, updated)}
                collapsed={subItems.length > 0}
              />
            </div>
          );
        })}

        {/* Always-visible add input */}
        <div className="flex items-center gap-2 mt-2">
          <input
            ref={addInputRef}
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder="Add a focus area..."
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all"
            autoComplete="off"
          />
        </div>
      </div>

      {activeItems.length === 0 && (
        <p className="text-sm text-[var(--md-text-tertiary)] italic text-center py-2">
          {doneCount > 0 ? "All focus items completed — nice work" : "Set your focus for the week"}
        </p>
      )}
    </div>
  );
}
