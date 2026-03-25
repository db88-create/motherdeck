"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFetch } from "@/lib/hooks";
import type { InboxItem } from "@/lib/services/inbox";
import { SubItemsList, parseSubItems, serializeSubItems, type SubItem } from "./sub-items";
import { DatePicker } from "./date-picker";
import { Inbox, Send, X, Square, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

export function InboxPanel() {
  const [input, setInput] = useState("");
  const [localItems, setLocalItems] = useState<InboxItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerId, setDatePickerId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, refetch } = useFetch<InboxItem[]>("/api/inbox?processed=false");

  useEffect(() => {
    if (data) {
      setLocalItems(data);
    }
  }, [data]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const captured = text;
    setInput("");

    const tempId = `temp-${Date.now()}`;
    setLocalItems((prev) => [
      { id: tempId, content: captured, sourceType: "text", processed: false, subItems: "[]", dueDate: "", createdAt: new Date().toISOString() },
      ...prev,
    ]);

    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: captured, sourceType: "text" }),
      });
      if (!res.ok) throw new Error("Failed");
      const newItem = await res.json();
      setLocalItems((prev) => prev.map((i) => (i.id === tempId ? newItem : i)));
    } catch {
      setLocalItems((prev) => prev.filter((i) => i.id !== tempId));
      setInput(captured);
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  }, [input, submitting]);

  const handleRemove = useCallback(
    async (id: string) => {
      setLocalItems((prev) => prev.filter((i) => i.id !== id));
      if (!id.startsWith("temp-")) {
        try {
          await fetch(`/api/inbox?id=${id}`, { method: "DELETE" });
        } catch {
          refetch();
        }
      }
    },
    [refetch]
  );

  const handleMarkDone = useCallback(
    async (id: string) => {
      setLocalItems((prev) => prev.filter((i) => i.id !== id));
      if (!id.startsWith("temp-")) {
        try {
          await fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, processed: true }),
          });
        } catch {
          refetch();
        }
      }
    },
    [refetch]
  );

  const handleSubItemsChange = useCallback(
    async (itemId: string, subItems: SubItem[]) => {
      const serialized = serializeSubItems(subItems);
      setLocalItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, subItems: serialized } : i))
      );

      if (!itemId.startsWith("temp-")) {
        try {
          await fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, subItems: serialized }),
          });
        } catch {
          refetch();
        }
      }
    },
    [refetch]
  );

  const handleDateChange = useCallback(
    async (itemId: string, iso: string) => {
      setLocalItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, dueDate: iso } : i))
      );
      setDatePickerId(null);
      if (!itemId.startsWith("temp-")) {
        try {
          await fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, dueDate: iso || null }),
          });
        } catch {
          refetch();
        }
      }
    },
    [refetch]
  );

  const handleClearDate = useCallback(
    async (itemId: string) => {
      setLocalItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, dueDate: "" } : i))
      );
      setDatePickerId(null);
      if (!itemId.startsWith("temp-")) {
        try {
          await fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: itemId, dueDate: null }),
          });
        } catch {
          refetch();
        }
      }
    },
    [refetch]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Sort: items with dates first (by date), then without dates (by created)
  const sortedItems = [...localItems].sort((a, b) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return 0; // keep original order for non-dated items
  });

  return (
    <div className="rounded-xl border border-[var(--md-border)] bg-[var(--card)] p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Inbox className="w-4 h-4 text-[var(--md-text-tertiary)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--md-text-secondary)]">
          Quick Capture
        </h3>
        {localItems.length > 0 && (
          <span className="ml-auto text-xs text-[var(--md-text-tertiary)]">
            {localItems.length}
          </span>
        )}
      </div>

      {/* Input — always visible */}
      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Capture a thought..."
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--md-surface)] border border-[var(--md-border)] text-sm text-[var(--md-text-body)] placeholder:text-[var(--md-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/40 transition-all"
          autoComplete="off"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || submitting}
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium transition-all",
            input.trim() && !submitting
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-[var(--md-surface)] text-[var(--md-text-disabled)] cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
        {sortedItems.length === 0 ? (
          <p className="text-sm text-[var(--md-text-tertiary)] italic py-4 text-center">
            Capture something — type above
          </p>
        ) : (
          sortedItems.map((item) => {
            const subItems = parseSubItems(item.subItems);
            return (
              <div key={item.id}>
                <div className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--md-surface)] transition-colors">
                  <button
                    onClick={() => handleMarkDone(item.id)}
                    className="shrink-0 mt-0.5 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-colors"
                    title="Mark done"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[var(--md-text-body)] leading-relaxed">
                      {item.content}
                    </span>
                    {/* Date badge */}
                    {item.dueDate && (
                      <span className={cn(
                        "ml-2 text-xs px-1.5 py-0.5 rounded inline-block",
                        isOverdue(item.dueDate) ? "text-red-500 bg-red-500/10" : "text-[var(--md-text-tertiary)]"
                      )}>
                        {formatDueDate(item.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {!item.dueDate && (
                      <button
                        onClick={() => setDatePickerId(datePickerId === item.id ? null : item.id)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-violet-500 transition-all"
                        title="Set date"
                      >
                        <Calendar className="w-3 h-3" />
                      </button>
                    )}
                    {item.dueDate && (
                      <button
                        onClick={() => handleClearDate(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all"
                        title="Clear date"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <span className="text-xs text-[var(--md-text-tertiary)]">
                      {timeAgo(item.createdAt)}
                    </span>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[var(--md-text-tertiary)] hover:text-[var(--md-error)] transition-all"
                      title="Delete"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Calendar date picker */}
                {datePickerId === item.id && (
                  <div className="relative ml-6">
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
          })
        )}
      </div>
    </div>
  );
}
